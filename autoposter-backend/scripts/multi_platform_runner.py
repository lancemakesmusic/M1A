# scripts/multi_platform_runner.py
"""
Multi-platform queue runner
Processes jobs and posts to multiple social media platforms
"""
import os
import argparse
import asyncio
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
import importlib.util
from datetime import datetime, timezone

# Load existing modules
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = PROJECT_ROOT / "scripts" / "db.py"
MULTI_PLATFORM_DB_PATH = PROJECT_ROOT / "scripts" / "db_multi_platform.py"

# Import database modules
spec = importlib.util.spec_from_file_location("db", DB_PATH)
db = importlib.util.module_from_spec(spec)
spec.loader.exec_module(db)

spec = importlib.util.spec_from_file_location("db_multi_platform", MULTI_PLATFORM_DB_PATH)
db_mp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(db_mp)

# Import platform modules
from multi_platform_manager import MultiPlatformManager, PlatformScheduler
from platform_abstraction import PlatformError, AuthenticationError, PostingError

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MultiPlatformRunner:
    """Multi-platform posting runner"""
    
    def __init__(self, client: str, dry_run: bool = False):
        self.client = client
        self.dry_run = dry_run
        self.logger = logging.getLogger(f"MultiPlatformRunner.{client}")
        
        # Load client configuration
        self.config = self._load_client_config()
        
        # Initialize platform manager
        self.platform_manager = MultiPlatformManager(client, self.config)
        self.scheduler = PlatformScheduler(client, self.config)
    
    def _load_client_config(self) -> Dict[str, Any]:
        """Load client configuration"""
        config_file = PROJECT_ROOT / "config" / "clients" / self.client / "client.json"
        
        if not config_file.exists():
            raise FileNotFoundError(f"Client configuration not found: {config_file}")
        
        import json
        with open(config_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    async def authenticate_platforms(self) -> Dict[str, bool]:
        """Authenticate with all enabled platforms"""
        self.logger.info(f"Authenticating platforms for {self.client}")
        
        try:
            auth_results = await self.platform_manager.authenticate_all()
            
            for platform, success in auth_results.items():
                if success:
                    self.logger.info(f"✅ {platform} authentication successful")
                else:
                    self.logger.warning(f"❌ {platform} authentication failed")
            
            return auth_results
            
        except Exception as e:
            self.logger.error(f"Authentication error: {e}")
            return {}
    
    async def process_job(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single job across multiple platforms"""
        job_id = job["id"]
        file_path = job["path"]
        content_type = job["content_type"]
        caption = job.get("caption")
        
        self.logger.info(f"Processing job #{job_id}: {content_type} -> {file_path}")
        
        # Get enabled platforms for this client
        client_platforms = db_mp.get_client_platforms(self.client)
        enabled_platforms = [cp["platform"] for cp in client_platforms if cp["enabled"]]
        
        if not enabled_platforms:
            self.logger.warning(f"No platforms enabled for client {self.client}")
            return {"success": False, "error": "No platforms enabled"}
        
        # Validate content for all platforms
        validation_results = self.platform_manager.validate_content(
            file_path, content_type, enabled_platforms
        )
        
        valid_platforms = [p for p, valid in validation_results.items() if valid]
        
        if not valid_platforms:
            self.logger.error(f"Content not valid for any platform: {validation_results}")
            return {"success": False, "error": "Content not valid for any platform"}
        
        # Create platform post records
        platform_post_ids = {}
        for platform in valid_platforms:
            try:
                post_id = db_mp.add_platform_post(job_id, platform, status="pending")
                platform_post_ids[platform] = post_id
                self.logger.info(f"Created platform post record for {platform}")
            except Exception as e:
                self.logger.error(f"Failed to create platform post record for {platform}: {e}")
        
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would post to platforms: {valid_platforms}")
            return {"success": True, "platforms": valid_platforms, "dry_run": True}
        
        # Post to platforms
        posting_results = {}
        for platform in valid_platforms:
            try:
                self.logger.info(f"Posting to {platform}...")
                
                # Post to single platform
                result = await self.platform_manager._post_to_platform(
                    platform, file_path, content_type, caption
                )
                
                posting_results[platform] = result
                
                # Update platform post record
                if result.get("success"):
                    db_mp.update_platform_post(
                        platform_post_ids[platform],
                        "posted",
                        result.get("post_id"),
                        result.get("url")
                    )
                    self.logger.info(f"✅ Posted to {platform}: {result.get('url', 'N/A')}")
                else:
                    db_mp.update_platform_post(
                        platform_post_ids[platform],
                        "failed",
                        error=result.get("error", "Unknown error")
                    )
                    self.logger.error(f"❌ Failed to post to {platform}: {result.get('error', 'Unknown error')}")
                
            except Exception as e:
                self.logger.error(f"❌ Error posting to {platform}: {e}")
                posting_results[platform] = {"success": False, "error": str(e)}
                
                # Update platform post record
                db_mp.update_platform_post(
                    platform_post_ids[platform],
                    "failed",
                    error=str(e)
                )
        
        # Check overall success
        successful_platforms = [p for p, r in posting_results.items() if r.get("success")]
        failed_platforms = [p for p, r in posting_results.items() if not r.get("success")]
        
        overall_success = len(successful_platforms) > 0
        
        self.logger.info(f"Posting completed: {len(successful_platforms)} successful, {len(failed_platforms)} failed")
        
        return {
            "success": overall_success,
            "platforms": valid_platforms,
            "successful_platforms": successful_platforms,
            "failed_platforms": failed_platforms,
            "results": posting_results
        }
    
    async def run_once(self) -> bool:
        """Run once and process available jobs"""
        self.logger.info(f"Starting multi-platform runner for {self.client}")
        
        # Authenticate with platforms
        auth_results = await self.authenticate_platforms()
        if not any(auth_results.values()):
            self.logger.error("No platforms authenticated successfully")
            return False
        
        # Get due jobs
        jobs = db.get_due_jobs(limit=10, client=self.client)
        if not jobs:
            self.logger.info("No due jobs found")
            return True
        
        self.logger.info(f"Found {len(jobs)} due jobs")
        
        # Process jobs
        for job in jobs:
            try:
                # Mark job as in progress
                db.mark_in_progress(job["id"])
                
                # Process the job
                result = await self.process_job(job)
                
                if result.get("success"):
                    # Mark job as done if at least one platform succeeded
                    db.mark_done(job["id"])
                    self.logger.info(f"✅ Job #{job['id']} completed successfully")
                else:
                    # Reschedule job if all platforms failed
                    from datetime import timedelta
                    new_eta = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
                    db.reschedule(job["id"], new_eta, reason="All platforms failed")
                    self.logger.warning(f"⚠️ Job #{job['id']} rescheduled due to failures")
                
            except Exception as e:
                self.logger.error(f"❌ Error processing job #{job['id']}: {e}")
                # Reschedule job
                from datetime import timedelta
                new_eta = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
                db.reschedule(job["id"], new_eta, reason=f"Processing error: {e}")
        
        return True
    
    async def run_continuous(self, interval: int = 60):
        """Run continuously with specified interval"""
        self.logger.info(f"Starting continuous multi-platform runner (interval: {interval}s)")
        
        while True:
            try:
                await self.run_once()
                await asyncio.sleep(interval)
            except KeyboardInterrupt:
                self.logger.info("Runner stopped by user")
                break
            except Exception as e:
                self.logger.error(f"Runner error: {e}")
                await asyncio.sleep(interval)

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Multi-platform posting runner")
    parser.add_argument("--client", required=True, help="Client name")
    parser.add_argument("--dry-run", action="store_true", help="Dry run mode")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--interval", type=int, default=60, help="Continuous run interval (seconds)")
    
    args = parser.parse_args()
    
    try:
        runner = MultiPlatformRunner(args.client, args.dry_run)
        
        if args.once:
            success = await runner.run_once()
            exit(0 if success else 1)
        else:
            await runner.run_continuous(args.interval)
            
    except Exception as e:
        logger.error(f"Runner failed: {e}")
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())
