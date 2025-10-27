# scripts/secure_config_loader.py
"""
Secure configuration loader for M1Autoposter
Replaces direct JSON loading with encrypted credential support
"""
import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
from security_manager import SecurityManager

class SecureConfigLoader:
    def __init__(self):
        self.security_manager = None
        self._init_security()
    
    def _init_security(self):
        """Initialize security manager if master key is available"""
        try:
            self.security_manager = SecurityManager()
        except ValueError:
            # No master key set, will use legacy mode
            pass
    
    def load_client_config(self, client_name: str) -> Dict[str, Any]:
        """
        Load client configuration with automatic credential decryption
        Falls back to legacy mode if encryption not available
        """
        client_dir = Path(__file__).parent.parent / "config" / "clients" / client_name
        client_file = client_dir / "client.json"
        
        if not client_file.exists():
            return {}
        
        try:
            with open(client_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # If credentials are encrypted, decrypt them
            if config.get('encrypted') and self.security_manager:
                username, password = self.security_manager.decrypt_credentials(config)
                config['IG_USERNAME'] = username
                config['IG_PASSWORD'] = password
                # Remove encrypted fields for backward compatibility
                config.pop('IG_USERNAME_encrypted', None)
                config.pop('IG_PASSWORD_encrypted', None)
                config.pop('encrypted', None)
            
            return config
            
        except Exception as e:
            print(f"⚠️ Failed to load config for {client_name}: {e}")
            return {}
    
    def save_client_config(self, client_name: str, config: Dict[str, Any], encrypt_credentials: bool = True) -> bool:
        """
        Save client configuration with optional credential encryption
        """
        client_dir = Path(__file__).parent.parent / "config" / "clients" / client_name
        client_file = client_dir / "client.json"
        
        try:
            # Create directory if it doesn't exist
            client_dir.mkdir(parents=True, exist_ok=True)
            
            # Create backup of existing file
            if client_file.exists():
                backup_file = client_file.with_suffix('.json.bak')
                with open(backup_file, 'w', encoding='utf-8') as f:
                    with open(client_file, 'r', encoding='utf-8') as src:
                        f.write(src.read())
            
            # Encrypt credentials if requested and security manager available
            if encrypt_credentials and self.security_manager:
                username = config.get('IG_USERNAME', '')
                password = config.get('IG_PASSWORD', '')
                
                if username and password:
                    encrypted_creds = self.security_manager.encrypt_credentials(username, password)
                    config.update(encrypted_creds)
            
            # Write configuration
            with open(client_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2)
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to save config for {client_name}: {e}")
            return False

# Global instance for easy import
secure_loader = SecureConfigLoader()

def load_client_config(client_name: str) -> Dict[str, Any]:
    """Convenience function for loading client config"""
    return secure_loader.load_client_config(client_name)

def save_client_config(client_name: str, config: Dict[str, Any], encrypt_credentials: bool = True) -> bool:
    """Convenience function for saving client config"""
    return secure_loader.save_client_config(client_name, config, encrypt_credentials)
