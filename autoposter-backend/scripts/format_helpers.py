"""
Visual formatting helpers for better terminal output
Provides Unicode symbols with ASCII fallbacks for compatibility
"""

import sys
import os

# Detect if terminal supports Unicode
def supports_unicode():
    """Check if terminal supports Unicode symbols"""
    if sys.platform == 'win32':
        # Windows: Check if we're in a modern terminal (Windows Terminal, PowerShell 7+)
        try:
            # Check for Windows Terminal or modern PowerShell
            term = os.environ.get('TERM_PROGRAM', '')
            if term in ['WindowsTerminal', 'vscode']:
                return True
            # PowerShell 7+ usually supports Unicode
            if hasattr(sys, 'ps1'):
                return True
            # Check Windows version (Windows 10 1903+ has better Unicode support)
            import platform
            version = platform.version()
            if version >= '10.0.18362':  # Windows 10 1903
                return True
        except:
            pass
        return False
    else:
        # Unix-like systems usually support Unicode
        return True

# Unicode symbols with ASCII fallbacks
class Symbols:
    """Unicode symbols with ASCII fallbacks"""
    
    if supports_unicode():
        CHECK = "✓"
        CROSS = "✗"
        WARNING = "⚠"
        INFO = "ℹ"
        ARROW_RIGHT = "→"
        ARROW_DOWN = "↓"
        FOLDER = "📁"
        KEY = "🔑"
        LINK = "🔗"
        GEAR = "⚙"
        ROCKET = "🚀"
        SPARKLES = "✨"
        FIRE = "🔥"
        STAR = "⭐"
        CHECKMARK = "✅"
        CROSSMARK = "❌"
        WARNING_SIGN = "⚠️"
        INFO_SIGN = "ℹ️"
        BULLET = "•"
        DASH = "─"
        VERTICAL = "│"
        CORNER_TL = "┌"
        CORNER_TR = "┐"
        CORNER_BL = "└"
        CORNER_BR = "┘"
        TEE_RIGHT = "├"
        TEE_LEFT = "┤"
        TEE_UP = "┬"
        TEE_DOWN = "┴"
        CROSS_TEE = "┼"
    else:
        # ASCII fallbacks
        CHECK = "[OK]"
        CROSS = "[X]"
        WARNING = "[!]"
        INFO = "[i]"
        ARROW_RIGHT = "->"
        ARROW_DOWN = "v"
        FOLDER = "[FOLDER]"
        KEY = "[KEY]"
        LINK = "[LINK]"
        GEAR = "[GEAR]"
        ROCKET = "[ROCKET]"
        SPARKLES = "[*]"
        FIRE = "[FIRE]"
        STAR = "[*]"
        CHECKMARK = "[OK]"
        CROSSMARK = "[X]"
        WARNING_SIGN = "[!]"
        INFO_SIGN = "[i]"
        BULLET = "*"
        DASH = "-"
        VERTICAL = "|"
        CORNER_TL = "+"
        CORNER_TR = "+"
        CORNER_BL = "+"
        CORNER_BR = "+"
        TEE_RIGHT = "+"
        TEE_LEFT = "+"
        TEE_UP = "+"
        TEE_DOWN = "+"
        CROSS_TEE = "+"

def format_header(title, width=60):
    """Format a header with box drawing"""
    if supports_unicode():
        top = Symbols.CORNER_TL + Symbols.DASH * (width - 2) + Symbols.CORNER_TR
        middle = Symbols.VERTICAL + f" {title}".ljust(width - 2) + Symbols.VERTICAL
        bottom = Symbols.CORNER_BL + Symbols.DASH * (width - 2) + Symbols.CORNER_BR
        return f"\n{top}\n{middle}\n{bottom}\n"
    else:
        return f"\n{'=' * width}\n  {title}\n{'=' * width}\n"

def format_section(title, width=60):
    """Format a section header"""
    if supports_unicode():
        return f"\n{Symbols.TEE_RIGHT}{Symbols.DASH * (width - 2)}{Symbols.TEE_LEFT}\n{Symbols.VERTICAL} {title}\n{Symbols.TEE_RIGHT}{Symbols.DASH * (width - 2)}{Symbols.TEE_LEFT}\n"
    else:
        return f"\n{'-' * width}\n{title}\n{'-' * width}\n"

def format_table(headers, rows, max_width=80):
    """Format data as a table"""
    if not rows:
        return "  (no data)"
    
    # Calculate column widths
    col_widths = [len(str(h)) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            if i < len(col_widths):
                col_widths[i] = max(col_widths[i], len(str(cell)))
    
    # Ensure table fits in max_width
    total_width = sum(col_widths) + (len(headers) - 1) * 3 + 4
    if total_width > max_width:
        # Scale down proportionally
        scale = (max_width - 4 - (len(headers) - 1) * 3) / sum(col_widths)
        col_widths = [int(w * scale) for w in col_widths]
    
    # Build table
    lines = []
    if supports_unicode():
        # Header
        header_line = Symbols.VERTICAL + " " + " ".join(
            str(h).ljust(col_widths[i]) for i, h in enumerate(headers)
        ) + " " + Symbols.VERTICAL
        separator = Symbols.TEE_RIGHT + Symbols.TEE_UP.join(
            Symbols.DASH * (w + 1) for w in col_widths
        ) + Symbols.TEE_LEFT
        lines.append(header_line)
        lines.append(separator)
        
        # Rows
        for row in rows:
            row_line = Symbols.VERTICAL + " " + " ".join(
                str(cell)[:col_widths[i]].ljust(col_widths[i]) 
                for i, cell in enumerate(row)
            ) + " " + Symbols.VERTICAL
            lines.append(row_line)
    else:
        # ASCII table
        header_line = "| " + " | ".join(
            str(h).ljust(col_widths[i]) for i, h in enumerate(headers)
        ) + " |"
        separator = "+" + "+".join("-" * (w + 2) for w in col_widths) + "+"
        lines.append(header_line)
        lines.append(separator)
        
        for row in rows:
            row_line = "| " + " | ".join(
                str(cell)[:col_widths[i]].ljust(col_widths[i])
                for i, cell in enumerate(row)
            ) + " |"
            lines.append(row_line)
    
    return "\n".join(lines)

def format_progress(current, total, width=40):
    """Format a progress bar"""
    if total == 0:
        return ""
    
    percentage = int((current / total) * 100)
    filled = int((current / total) * width)
    
    if supports_unicode():
        bar = "█" * filled + "░" * (width - filled)
        return f"[{bar}] {percentage}% ({current}/{total})"
    else:
        bar = "#" * filled + "-" * (width - filled)
        return f"[{bar}] {percentage}% ({current}/{total})"

def format_status(message, status="info"):
    """Format a status message with icon"""
    icons = {
        "success": Symbols.CHECKMARK,
        "error": Symbols.CROSSMARK,
        "warning": Symbols.WARNING_SIGN,
        "info": Symbols.INFO_SIGN,
        "ok": Symbols.CHECK,
        "fail": Symbols.CROSS
    }
    icon = icons.get(status.lower(), Symbols.INFO)
    return f"{icon} {message}"


