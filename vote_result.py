import json
import glob
from collections import defaultdict

def summarize_votes_with_outcome():
    # 안건 결과 불러오기
    result_files = ["all.json", "cost.json", "cosstly.json", "etc.json", "law.json"]
    bill_results = {}
    for file in result_files:
        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for bill in data.get("data", []):
                bill_id = bill.get("BILL_ID")
                result = bill.get("PROC_RESULT_CD")
                if bill_id and result:
                    bill_results[bill_id] = result

    summary = defaultdict(lambda: {
        "찬성": 0, "반대": 0, "기권": 0,
        "찬성-가결": 0, "찬성-부결": 0,
        "반대-가결": 0, "반대-부결": 0,
        "기타": 0
    })

    bill_ids_set = set()
    seen_votes = set()  # (의원, BILL_ID) 기준 중복 방지

    vote_files = glob.glob("vote_*.json")
    print(f"총 {len(vote_files)}개의 vote_* 파일을 처리합니다.")

    for filename in vote_files:
        with open(filename, "r", encoding="utf-8") as f:
            data = json.load(f)

        for vote in data.get("vote_data", []):
            name = vote.get("HG_NM")
            result = vote.get("RESULT_VOTE_MOD")
            bill_id = vote.get("BILL_ID")

            if not (name and result in ["찬성", "반대", "기권"] and bill_id):
                continue

            key = (name, bill_id)
            if key in seen_votes:
                continue
            seen_votes.add(key)

            bill_ids_set.add(bill_id)
            summary[name][result] += 1

            # 안건 결과 반영
            proc_result = bill_results.get(bill_id)
            if proc_result:
                if result == "찬성":
                    if "가결" in proc_result:
                        summary[name]["찬성-가결"] += 1
                    elif "부결" in proc_result:
                        summary[name]["찬성-부결"] += 1
                    else:
                        summary[name]["기타"] += 1
                elif result == "반대":
                    if "가결" in proc_result:
                        summary[name]["반대-가결"] += 1
                    elif "부결" in proc_result:
                        summary[name]["반대-부결"] += 1
                    else:
                        summary[name]["기타"] += 1
                else:
                    summary[name]["기타"] += 1
            else:
                summary[name]["기타"] += 1

    # 비율 계산
    summary_with_ratios = {}
    for name, counts in summary.items():
        total = counts["찬성"] + counts["반대"] + counts["기권"]
        if total == 0:
            continue
        summary_with_ratios[name] = {
            "찬성": counts["찬성"],
            "반대": counts["반대"],
            "기권": counts["기권"],
            "총투표": total,
            "찬성률": round(counts["찬성"] / total * 100, 2),
            "반대률": round(counts["반대"] / total * 100, 2),
            "기권률": round(counts["기권"] / total * 100, 2),
            "찬성-가결": counts["찬성-가결"],
            "찬성-부결": counts["찬성-부결"],
            "반대-가결": counts["반대-가결"],
            "반대-부결": counts["반대-부결"],
            "기타": counts["기타"]
        }

    final_output = {
        "총_안건_수": len(bill_ids_set),
        "의원별_투표_요약": summary_with_ratios
    }

    with open("vote_summary.json", "w", encoding="utf-8") as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)

    print(f"✅ 중복 제거 후 'vote_summary.json'에 저장했습니다. (총 안건 수: {len(bill_ids_set)})")

# 실행
summarize_votes_with_outcome()
