import os
import json
import requests
import hashlib

# Load config with updated path and name
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "notion_hub_config.json")
with open(CONFIG_PATH, "r") as f:
    CONFIG = json.load(f)

NOTION_KEY = os.environ.get("NOTION_API_KEY") or open(os.path.expanduser("~/.config/notion/api_key")).read().strip()
HEADERS = {
    "Authorization": f"Bearer {NOTION_KEY}",
    "Notion-Version": CONFIG["notion"]["version"],
    "Content-Type": "application/json"
}

STATE_FILE = os.path.join(os.path.dirname(__file__), "..", "config", "upload_state.json")

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def get_file_hash(path):
    hasher = hashlib.md5()
    with open(path, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

def upload_to_hub(title, domain, doc_type, content_path):
    db_id = CONFIG["notion"]["database_id"]
    with open(content_path, "r") as f:
        lines = f.readlines()
    
    blocks = []
    for line in lines:
        line = line.strip()
        if not line: continue
        blocks.append({"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"text": {"content": line[:2000]}}]}})

    payload = {
        "parent": {"database_id": db_id},
        "properties": {
            "Name": {"title": [{"text": {"content": title}}]},
            "Domain": {"select": {"name": domain}},
            "Type": {"select": {"name": doc_type}},
            "Status": {"select": {"name": "Pending"}}
        },
        "children": blocks[:100]
    }
    r = requests.post("https://api.notion.com/v1/pages", headers=HEADERS, json=payload)
    if r.status_code == 200:
        return True
    else:
        print(f"ERROR: Upload failed for {title} - {r.text}")
        return False

def scan_and_upload():
    pending_dir = CONFIG["paths"]["pending"]
    if not os.path.exists(pending_dir): return

    state = load_state()
    files = [f for f in os.listdir(pending_dir) if f.endswith(".md")]
    
    uploaded_files = []
    skipped_files = []

    if not files:
        print("UPLOAD_SUMMARY: No files to process.")
        return

    rev_domains = {v: k for k, v in CONFIG["mappings"]["domains"].items()}
    rev_types = {v: k for k, v in CONFIG["mappings"]["types"].items()}

    for filename in files:
        file_path = os.path.join(pending_dir, filename)
        current_hash = get_file_hash(file_path)
        
        if state.get(filename) == current_hash:
            skipped_files.append(filename)
            continue

        parts = filename.replace(".md", "").split("_")
        domain = rev_domains.get(parts[0], "Ansible") if len(parts) > 0 else "Ansible"
        doc_type = rev_types.get(parts[1], "Standard Procedure") if len(parts) > 1 else "Standard Procedure"
        title = " ".join(parts[2:]) if len(parts) > 2 else filename.replace(".md", "")
        
        if upload_to_hub(title, domain, doc_type, file_path):
            state[filename] = current_hash
            uploaded_files.append(filename)

    save_state(state)
    
    print(f"UPLOAD_SUMMARY:")
    print(f"UPLOADED: {', '.join(uploaded_files) if uploaded_files else 'None'}")
    print(f"SKIPPED: {', '.join(skipped_files) if skipped_files else 'None'}")

if __name__ == "__main__":
    scan_and_upload()
