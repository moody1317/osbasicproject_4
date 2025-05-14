import json
import os
import glob
from collections import defaultdict

def summarize_votes_with_ratios():
    summary = defaultdict(lambda: {"찬성": 0, "반대": 0, "기권": 0})
    bill_ids_set = set()  # 고유한 BILL_ID 저장용 ->중복처리

    # vote_로 시작하는 모든 JSON 파일 읽기
    vote_files = glob.glob("vote_*.json")
    print(f"총 {len(vote_files)}개의 파일을 처리합니다.")

    for filename in vote_files:
        with open(filename, "r", encoding="utf-8") as f:
            data = json.load(f)

        for vote in data.get("vote_data", []):
            name = vote.get("HG_NM")
            result = vote.get("RESULT_VOTE_MOD")
            bill_id = vote.get("BILL_ID")

            if bill_id:
                bill_ids_set.add(bill_id)

            if name and result in ["찬성", "반대", "기권"]:
                summary[name][result] += 1

    # 비율 추가
    summary_with_ratios = {}
    for name, counts in summary.items():
        total = counts["찬성"] + counts["반대"] + counts["기권"]
        if total == 0:
            continue  # 제외
        summary_with_ratios[name] = {
            "찬성": counts["찬성"],
            "반대": counts["반대"],
            "기권": counts["기권"],
            "총투표": total,
            "찬성률": round(counts["찬성"] / total * 100, 2),
            "반대률": round(counts["반대"] / total * 100, 2),
            "기권률": round(counts["기권"] / total * 100, 2)
        }

    # 최종 결과 구성
    final_output = {
        "총_안건_수": len(bill_ids_set),
        "의원별_투표_요약": summary_with_ratios
    }

    # 결과 저장
    with open("vote_summary.json", "w", encoding="utf-8") as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)

    print(f"✅ 투표 요약과 비율을 'vote_summary.json'에 저장했습니다. (총 안건 수: {len(bill_ids_set)})")

# 실행
summarize_votes_with_ratios()
