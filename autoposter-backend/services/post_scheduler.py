#!/usr/bin/env python3
"""
Post Scheduler Service
Background worker that checks for and executes due posts
"""

import asyncio
import logging
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
import sys

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from services.post_executor import get_post_executor

logger = logging.getLogger(__name__)

class PostScheduler:
    """Background scheduler for executing scheduled posts"""
    
    def __init__(self, storage_file: Path = None):
        self.storage_file = storage_file or (PROJECT_ROOT / "data" / "scheduled_posts.json")
        self.storage_file.parent.mkdir(parents=True, exist_ok=True)
        self.executor = get_post_executor()
        self.running = False
        self._load_posts()
    
    def _load_posts(self):
        """Load scheduled posts from storage"""
        if self.storage_file.exists():
            try:
                with open(self.storage_file, 'r') as f:
                    data = json.load(f)
                    self.scheduled_posts = data.get("posts", [])
                    logger.info(f"Loaded {len(self.scheduled_posts)} scheduled posts")
            except Exception as e:
                logger.error(f"Error loading posts: {e}")
                self.scheduled_posts = []
        else:
            self.scheduled_posts = []
    
    def _save_posts(self):
        """Save scheduled posts to storage"""
        try:
            data = {
                "posts": self.scheduled_posts,
                "last_updated": datetime.now().isoformat()
            }
            with open(self.storage_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving posts: {e}")
    
    def add_post(self, post: Dict[str, Any]):
        """Add a new scheduled post"""
        self.scheduled_posts.append(post)
        self._save_posts()
        logger.info(f"Added scheduled post: {post.get('id')}")
    
    def update_post(self, post_id: str, updates: Dict[str, Any]):
        """Update an existing post"""
        for i, post in enumerate(self.scheduled_posts):
            if post.get("id") == post_id:
                self.scheduled_posts[i].update(updates)
                self._save_posts()
                logger.info(f"Updated post: {post_id}")
                return True
        return False
    
    def get_due_posts(self) -> List[Dict[str, Any]]:
        """Get posts that are due to be executed"""
        now = datetime.now()
        due_posts = []
        
        for post in self.scheduled_posts:
            status = post.get("status", "scheduled")
            if status != "scheduled":
                continue
            
            scheduled_time_str = post.get("scheduledTime")
            if not scheduled_time_str:
                continue
            
            try:
                scheduled_time = datetime.fromisoformat(scheduled_time_str.replace('Z', '+00:00'))
                # Convert to local time if needed
                if scheduled_time.tzinfo:
                    scheduled_time = scheduled_time.astimezone().replace(tzinfo=None)
                
                # Check if due (within last minute to account for timing)
                if scheduled_time <= now:
                    due_posts.append(post)
            except Exception as e:
                logger.error(f"Error parsing scheduled time for post {post.get('id')}: {e}")
        
        return due_posts
    
    async def execute_due_posts(self):
        """Execute all due posts"""
        due_posts = self.get_due_posts()
        
        if not due_posts:
            return
        
        logger.info(f"Found {len(due_posts)} due posts to execute")
        
        for post in due_posts:
            post_id = post.get("id")
            logger.info(f"Executing post: {post_id}")
            
            # Update status to "posting"
            self.update_post(post_id, {"status": "posting", "postingAt": datetime.now().isoformat()})
            
            try:
                # Execute the post
                results = await self.executor.execute_post(post)
                
                if results.get("success"):
                    # Update status to "posted"
                    self.update_post(post_id, {
                        "status": "posted",
                        "postedAt": datetime.now().isoformat(),
                        "postResults": results
                    })
                    logger.info(f"✅ Post {post_id} executed successfully")
                else:
                    # Update status to "failed"
                    self.update_post(post_id, {
                        "status": "failed",
                        "failedAt": datetime.now().isoformat(),
                        "error": results.get("errors", ["Unknown error"])
                    })
                    logger.error(f"❌ Post {post_id} failed: {results.get('errors')}")
                    
            except Exception as e:
                logger.error(f"Error executing post {post_id}: {e}")
                self.update_post(post_id, {
                    "status": "failed",
                    "failedAt": datetime.now().isoformat(),
                    "error": str(e)
                })
    
    async def run_loop(self, interval_seconds: int = 60):
        """Run the scheduler loop"""
        self.running = True
        logger.info(f"Post scheduler started (checking every {interval_seconds} seconds)")
        
        while self.running:
            try:
                await self.execute_due_posts()
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
            
            await asyncio.sleep(interval_seconds)
    
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        logger.info("Post scheduler stopped")
    
    def get_all_posts(self) -> List[Dict[str, Any]]:
        """Get all scheduled posts"""
        return self.scheduled_posts.copy()

# Global scheduler instance
_scheduler = None

def get_scheduler() -> PostScheduler:
    """Get singleton scheduler instance"""
    global _scheduler
    if _scheduler is None:
        _scheduler = PostScheduler()
    return _scheduler
















