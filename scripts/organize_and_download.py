import os
import json
import re
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image
import io

DATA_PATH = r"C:\Users\ADMIN\.gemini\antigravity\brain\4b8da55e-60f0-44ca-bf08-40476690789a\.user_uploaded\media_1793203342425_4a5b354a.txt"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
TEAMS_DIR = os.path.join(ASSETS_DIR, "Teams")

def sanitize_folder_name(name):
    # Remove surrounding quotes, replace invalid windows chars: < > : " / \ | ? *
    clean = re.sub(r'^[ "\']+|[ "\']+$', '', name)
    clean = re.sub(r'[<>:"/\\|?*]', '_', clean).strip()
    return clean

def download_url(url, timeout=20):
    if not url or not url.startswith("http"):
        return None
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return None

def process_image(data, target_path):
    if not data:
        return False
    try:
        img = Image.open(io.BytesIO(data))
        # Convert RGBA / P to RGB for JPEG compatibility
        if img.mode in ("RGBA", "P", "LA"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")
        img.save(target_path, "JPEG", quality=90)
        return True
    except Exception as e:
        print(f"PIL error saving {target_path}, falling back to raw bytes: {e}")
        try:
            with open(target_path, "wb") as f:
                f.write(data)
            return True
        except Exception as e2:
            print(f"Raw write error: {e2}")
            return False

def extract_docx_text(docx_bytes):
    try:
        import zipfile
        import xml.etree.ElementTree as ET
        with zipfile.ZipFile(io.BytesIO(docx_bytes)) as z:
            xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            # Find all w:p (paragraphs)
            paragraphs = []
            for p in tree.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                texts = [node.text for node in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t") if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n\n".join(paragraphs)
    except Exception as e:
        print(f"Error extracting docx text: {e}")
        return ""

def main():
    os.makedirs(TEAMS_DIR, exist_ok=True)
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        teams = json.load(f)
    print(f"Loaded {len(teams)} teams.")

    master_list = []
    download_tasks = []

    for idx, team in enumerate(teams):
        raw_name = team.get("teamName", f"Team_{idx+1}")
        folder_name = sanitize_folder_name(raw_name)
        team_folder = os.path.join(TEAMS_DIR, folder_name)
        os.makedirs(team_folder, exist_ok=True)

        # ID Card URLs
        id_cards = [
            ("1.jpg", team.get("teamLeaderIdCard")),
            ("2.jpg", team.get("member1IdCard")),
            ("3.jpg", team.get("member2IdCard")),
            ("4.jpg", team.get("member3IdCard")),
        ]

        # Abstract
        orig_name = team.get("abstractPdfOriginalName", "")
        abstract_url = team.get("abstractPdf", "")
        is_docx = orig_name.lower().endswith(".docx") or ("docx" in abstract_url.lower())
        abstract_filename = "Abstract.docx" if is_docx else "Abstract.pdf"
        abstract_path = os.path.join(team_folder, abstract_filename)

        team_info = {
            "index": idx + 1,
            "id": team.get("_id", {}).get("$oid", f"team_{idx+1}"),
            "registrationId": team.get("registrationId", f"REG-{idx+1:03d}"),
            "rawTeamName": raw_name,
            "folderName": folder_name,
            "folderRelPath": f"assets/Teams/{folder_name}",
            "projectTitle": team.get("projectTitle", ""),
            "teamSize": team.get("teamSize", 0),
            "teamAffiliation": team.get("teamAffiliation", ""),
            "aliahMembers": team.get("aliahMembers", 0),
            "otherInstitutionMembers": team.get("otherInstitutionMembers", 0),
            "teamLeaderName": team.get("teamLeaderName", ""),
            "teamLeaderEmail": team.get("teamLeaderEmail", ""),
            "teamLeaderPhone": team.get("teamLeaderPhone", ""),
            "teamMemberDetails": team.get("teamMemberDetails", ""),
            "hardwareProjectCategories": team.get("hardwareProjectCategories", []),
            "prototypeType": team.get("prototypeType", ""),
            "hasWorkingPrototype": team.get("hasWorkingPrototype", ""),
            "currentWorkingStatus": team.get("currentWorkingStatus", ""),
            "problemStatement": team.get("problemStatement", ""),
            "solutionDescription": team.get("solutionDescription", ""),
            "innovationDescription": team.get("innovationDescription", ""),
            "workingPrinciple": team.get("workingPrinciple", ""),
            "majorHardwareComponents": team.get("majorHardwareComponents", []),
            "useAi": team.get("useAi", False),
            "useIot": team.get("useIot", False),
            "powerSource": team.get("powerSource", ""),
            "intendedBeneficiaries": team.get("intendedBeneficiaries", []),
            "potentialImpact": team.get("potentialImpact", ""),
            "productPotential": team.get("productPotential", ""),
            "prototypeDevelopmentCost": team.get("prototypeDevelopmentCost", 0),
            "auraDemoHighlight": team.get("auraDemoHighlight", ""),
            "safetyHazards": team.get("safetyHazards", []),
            "safetyPrecautions": team.get("safetyPrecautions", ""),
            "requiresContinuousSupervision": team.get("requiresContinuousSupervision", False),
            "prototypeDevelopedByTeam": team.get("prototypeDevelopedByTeam", ""),
            "previouslyExhibited": team.get("previouslyExhibited", False),
            "previousExhibitionDetails": team.get("previousExhibitionDetails", ""),
            "registrationFeeStatus": team.get("registrationFeeStatus", ""),
            "registrationFee": team.get("registrationFee", 0),
            "createdAt": team.get("createdAt", {}).get("$date", ""),
            "updatedAt": team.get("updatedAt", {}).get("$date", ""),
            "abstract": {
                "originalName": orig_name,
                "url": abstract_url,
                "filename": abstract_filename,
                "relPath": f"assets/Teams/{folder_name}/{abstract_filename}",
                "isDocx": is_docx
            },
            "idCards": []
        }

        # Queue ID card downloads
        for slot, (filename, url) in enumerate(id_cards, 1):
            target_file = os.path.join(team_folder, filename)
            rel_path = f"assets/Teams/{folder_name}/{filename}"
            card_info = {
                "slot": slot,
                "filename": filename,
                "relPath": rel_path,
                "url": url,
                "exists": False
            }
            if url and url.startswith("http"):
                download_tasks.append(("image", url, target_file, card_info))
            team_info["idCards"].append(card_info)

        # Queue abstract download
        if abstract_url and abstract_url.startswith("http"):
            download_tasks.append(("abstract", abstract_url, abstract_path, team_info["abstract"]))

        # Save individual data.json for the team
        data_json_path = os.path.join(team_folder, "data.json")
        with open(data_json_path, "w", encoding="utf-8") as out_f:
            json.dump(team_info, out_f, indent=2, ensure_ascii=False)

        master_list.append(team_info)

    print(f"Total download tasks queued: {len(download_tasks)}")

    def run_task(task):
        kind, url, dest, meta = task
        # Skip if already exists and has non-trivial size
        if os.path.exists(dest) and os.path.getsize(dest) > 100:
            meta["exists"] = True
            return True, dest, os.path.getsize(dest)

        content = download_url(url)
        if not content:
            return False, dest, 0

        if kind == "image":
            ok = process_image(content, dest)
            if ok:
                meta["exists"] = True
                return True, dest, os.path.getsize(dest)
            return False, dest, 0
        else:
            with open(dest, "wb") as f:
                f.write(content)
            meta["exists"] = True
            if meta.get("isDocx"):
                # Also extract text for immediate in-browser reading
                text_content = extract_docx_text(content)
                meta["extractedText"] = text_content
                txt_path = dest.replace(".docx", "_extracted.txt")
                with open(txt_path, "w", encoding="utf-8") as tf:
                    tf.write(text_content)
            return True, dest, len(content)

    success_count = 0
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(run_task, t): t for t in download_tasks}
        for future in as_completed(futures):
            ok, dest, size = future.result()
            if ok:
                success_count += 1

    print(f"Downloads completed: {success_count}/{len(download_tasks)}")

    # Update individual data.json files with updated meta (exists, extractedText, etc.)
    for team_info in master_list:
        folder_name = team_info["folderName"]
        team_folder = os.path.join(TEAMS_DIR, folder_name)
        data_json_path = os.path.join(team_folder, "data.json")
        with open(data_json_path, "w", encoding="utf-8") as out_f:
            json.dump(team_info, out_f, indent=2, ensure_ascii=False)

    # Save master teams.json
    master_json_path = os.path.join(ASSETS_DIR, "teams.json")
    with open(master_json_path, "w", encoding="utf-8") as mf:
        json.dump(master_list, mf, indent=2, ensure_ascii=False)
    print(f"Saved master catalog to {master_json_path}")

if __name__ == "__main__":
    main()
