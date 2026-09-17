import os
import re
import shutil
import hermes_cli

# 1. Locate web_dist and tui_dist
hermes_dir = os.path.dirname(hermes_cli.__file__)
web_dist_dir = os.path.join(hermes_dir, "web_dist")
index_html_path = os.path.join(web_dist_dir, "index.html")
assets_dir = os.path.join(web_dist_dir, "assets")

tui_dist_dir = os.path.join(hermes_dir, "tui_dist")
entry_js_path = os.path.join(tui_dist_dir, "entry.js")

print(f"[Rebrand] Locating Hermes Web UI at: {web_dist_dir}")

# 2. Check if index.html exists
if not os.path.exists(index_html_path):
    print(f"[Rebrand] Error: index.html not found at {index_html_path}")
    exit(1)

# 3. Copy custom branding files to assets directory
src_css = "/app/custom-branding.css"
src_js = "/app/custom-branding.js"
src_logo = "/app/logo.png"

# Fallbacks for local verification
if not os.path.exists(src_css):
    src_css = os.path.join(os.path.dirname(os.path.abspath(__file__)), "custom-branding.css")
if not os.path.exists(src_js):
    src_js = os.path.join(os.path.dirname(os.path.abspath(__file__)), "custom-branding.js")
if not os.path.exists(src_logo):
    src_logo = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logo.png")

if os.path.exists(src_css):
    shutil.copy(src_css, os.path.join(assets_dir, "custom-branding.css"))
    print("[Rebrand] Copied custom-branding.css to assets")
else:
    print(f"[Rebrand] Warning: {src_css} not found")

if os.path.exists(src_js):
    shutil.copy(src_js, os.path.join(assets_dir, "custom-branding.js"))
    print("[Rebrand] Copied custom-branding.js to assets")
else:
    print(f"[Rebrand] Warning: {src_js} not found")

if os.path.exists(src_logo):
    shutil.copy(src_logo, os.path.join(assets_dir, "logo.png"))
    print("[Rebrand] Copied logo.png to assets")
else:
    print(f"[Rebrand] Warning: {src_logo} not found")

# 4. Patch index.html
with open(index_html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

patch_css = '<link rel="stylesheet" href="/assets/custom-branding.css">'
patch_js = '<script defer src="/assets/custom-branding.js"></script>'

modified = False
if patch_css not in html_content:
    html_content = html_content.replace("</head>", f"  {patch_css}\n</head>")
    modified = True
if patch_js not in html_content:
    html_content = html_content.replace("</head>", f"  {patch_js}\n</head>")
    modified = True

if modified:
    with open(index_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print("[Rebrand] Patched index.html successfully")
else:
    print("[Rebrand] index.html is already patched")

# 5. Patch TUI entry.js (Branding overrides)
if os.path.exists(entry_js_path):
    print(f"[Rebrand] Found TUI entry.js at: {entry_js_path}")
    with open(entry_js_path, "r", encoding="utf-8") as f:
        tui_content = f.read()

    tui_modified = False

    # Check if already modified
    if "GRCOMPLIANCE" not in tui_content:
        # Patch LOGO_ART
        new_logo_art = '''LOGO_ART = [
      " ██████╗ ██████╗  ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗     ██╗ ██████╗ ███╗   ██╗ ██████╗███████╗",
      "██╔════╝ ██╔══██╗██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║     ██║██╔══██╗████╗  ██║██╔════╝██╔════╝",
      "██║  ███╗██████╔╝██║     ██║   ██║██╔████╔██║██████╔╝██║     ██║███████║██╔██╗ ██║██║     █████╗  ",
      "██║   ██║██╔══██╗██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║     ██║██╔══██║██║╚██╗██║██║     ██╔══╝  ",
      "╚██████╔╝██║  ██║╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ███████╗██║██║  ██║██║ ╚████║╚██████╗███████╗",
      " ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚══════╝╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝"
    ];'''
        tui_content = re.sub(r'LOGO_ART\s*=\s*\[[\s\S]*?\];', new_logo_art, tui_content)

        # Patch CADUCEUS_ART
        new_shield_art = '''CADUCEUS_ART = [
      "       ,▄▄████████▄▄,       ",
      "     ▄████████████████▄     ",
      "    ████████████████████    ",
      "   ██████████████████████   ",
      "  ███████▀▀  ██  ▀▀███████  ",
      "  ██████     ██     ██████  ",
      "  ██████     ██     ██████  ",
      "  ██████     ██     ██████  ",
      "  ██████     ██     ██████  ",
      "  ▀██████    ██    ██████▀  ",
      "   ▀██████   ██   ██████▀   ",
      "     ▀██████ ████████▀      ",
      "       ▀▀████████▀▀         "
    ];'''
        tui_content = re.sub(r'CADUCEUS_ART\s*=\s*\[[\s\S]*?\];', new_shield_art, tui_content)

        # Patch TAG lines
        tui_content = re.sub(r'TAG_FULL\s*=\s*".*?";', lambda m: 'TAG_FULL = "GRCompliance \u00b7 AI Compliance Assistant";', tui_content)
        tui_content = re.sub(r'TAG_MID\s*=\s*".*?";', lambda m: 'TAG_MID = "AI Compliance Assistant";', tui_content)
        tui_content = re.sub(r'TAG_TINY\s*=\s*".*?";', lambda m: 'TAG_TINY = "GRCompliance";', tui_content)
        
        tui_modified = True

    if tui_modified:
        with open(entry_js_path, "w", encoding="utf-8") as f:
            f.write(tui_content)
        print("[Rebrand] Patched TUI entry.js successfully")
    else:
        print("[Rebrand] TUI entry.js is already patched")
else:
    print(f"[Rebrand] Warning: TUI entry.js not found at {entry_js_path}")
