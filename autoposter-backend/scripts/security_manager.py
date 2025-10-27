# scripts/security_manager.py
"""
Security Manager for M1Autoposter
Handles encryption/decryption of sensitive credentials
"""
import os
import json
import base64
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class SecurityManager:
    def __init__(self, master_key: str = None):
        """
        Initialize security manager with master key
        If no key provided, will generate one or use environment variable
        """
        self.master_key = master_key or os.getenv('M1AUTOPOSTER_MASTER_KEY')
        if not self.master_key:
            raise ValueError("Master key required. Set M1AUTOPOSTER_MASTER_KEY environment variable")
        
        # Derive encryption key from master key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'm1autoposter_salt_2024',  # Fixed salt for consistency
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key.encode()))
        self.cipher = Fernet(key)
    
    def encrypt_credentials(self, username: str, password: str) -> dict:
        """Encrypt Instagram credentials"""
        return {
            'IG_USERNAME': self.cipher.encrypt(username.encode()).decode(),
            'IG_PASSWORD': self.cipher.encrypt(password.encode()).decode(),
            'encrypted': True
        }
    
    def decrypt_credentials(self, encrypted_data: dict) -> tuple:
        """Decrypt Instagram credentials"""
        if not encrypted_data.get('encrypted'):
            # Legacy unencrypted data
            return encrypted_data.get('IG_USERNAME', ''), encrypted_data.get('IG_PASSWORD', '')
        
        username = self.cipher.decrypt(encrypted_data['IG_USERNAME'].encode()).decode()
        password = self.cipher.decrypt(encrypted_data['IG_PASSWORD'].encode()).decode()
        return username, password
    
    def migrate_client_credentials(self, client_name: str) -> bool:
        """Migrate a client's credentials to encrypted format"""
        client_dir = Path(__file__).parent.parent / "config" / "clients" / client_name
        client_file = client_dir / "client.json"
        
        if not client_file.exists():
            return False
        
        try:
            # Read current config
            with open(client_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Check if already encrypted
            if config.get('encrypted'):
                print(f"✅ {client_name} credentials already encrypted")
                return True
            
            # Encrypt credentials
            username = config.get('IG_USERNAME', '')
            password = config.get('IG_PASSWORD', '')
            
            if not username or not password:
                print(f"⚠️ {client_name} missing credentials, skipping")
                return False
            
            encrypted_creds = self.encrypt_credentials(username, password)
            
            # Update config with encrypted credentials
            config.update(encrypted_creds)
            
            # Create backup
            backup_file = client_file.with_suffix('.json.bak')
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2)
            
            # Write encrypted config
            with open(client_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2)
            
            print(f"✅ {client_name} credentials encrypted successfully")
            return True
            
        except Exception as e:
            print(f"❌ Failed to encrypt {client_name}: {e}")
            return False
    
    def migrate_all_clients(self):
        """Migrate all client credentials to encrypted format"""
        clients_dir = Path(__file__).parent.parent / "config" / "clients"
        
        if not clients_dir.exists():
            print("No clients directory found")
            return
        
        clients = [d.name for d in clients_dir.iterdir() if d.is_dir()]
        
        if not clients:
            print("No clients found")
            return
        
        print(f"🔐 Encrypting credentials for {len(clients)} clients...")
        
        success_count = 0
        for client in clients:
            if self.migrate_client_credentials(client):
                success_count += 1
        
        print(f"✅ Successfully encrypted {success_count}/{len(clients)} clients")

def main():
    """CLI for credential encryption"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Encrypt M1Autoposter credentials")
    parser.add_argument("--master-key", help="Master encryption key")
    parser.add_argument("--client", help="Specific client to encrypt")
    parser.add_argument("--all", action="store_true", help="Encrypt all clients")
    
    args = parser.parse_args()
    
    if not args.master_key and not os.getenv('M1AUTOPOSTER_MASTER_KEY'):
        print("❌ Master key required. Set M1AUTOPOSTER_MASTER_KEY environment variable or use --master-key")
        return
    
    try:
        sm = SecurityManager(args.master_key)
        
        if args.client:
            sm.migrate_client_credentials(args.client)
        elif args.all:
            sm.migrate_all_clients()
        else:
            print("Specify --client <name> or --all")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
