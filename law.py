# 본회의 처리안건_법률안
import requests
import json

# 1. API URL 설정
api_url = "https://open.assembly.go.kr/portal/openapi/nwbpacrgavhjryiph"

# 2. API 키 설정
api_key = "927928bf24af47d4afa7b805ed0bf4fc"

# 3. 요청 파라미터 설정 (AGE=21,22만 포함)
params = {
    "KEY": api_key,
    "Type": "json",
    "pIndex": "1",
    "pSize": "1000",  # 최대 1000개 요청
    "AGE": "22"   # 22대 의안만
}

# 4. API 요청 보내기
response = requests.get(api_url, params=params)

# 5. 응답 분석 및 필터링
if response.status_code == 200:
    try:
        data = response.json()

        if 'nwbpacrgavhjryiph' in data and isinstance(data['nwbpacrgavhjryiph'], list):
            api_list = data['nwbpacrgavhjryiph']

            if len(api_list) > 1:
                second_item = api_list[1]

                if isinstance(second_item, dict) and 'row' in second_item:
                    rows = second_item['row']
                    print(f"'row' 데이터 수: {len(rows)}")

                    # 필요한 필드만 추출
                    target_fields = ["BILL_NO", "BILL_NM", "PROPOSER", "PROC_RESULT_CD", "ANNOUNCE_DT"]
                    korean_labels = {
                                "BILL_NO": "의안번호",
                                "BILL_NM": "의안명",
                                "PROPOSER": "제안자",
                                "PROC_RESULT_CD": "의안결과",
                                "ANNOUNCE_DT": "공포일",
                            }
                    filtered_rows = []
                    for row in rows:
                        filtered_row = {korean_labels[field]: row.get(field, "") for field in target_fields}
                        filtered_rows.append(filtered_row)

                    filtered_data = {
                        "nwbpacrgavhjryiph": filtered_rows
                    }

                    print("\n필터링된 결과:")
                    print(json.dumps(filtered_data, indent=4, ensure_ascii=False))

                    # JSON 파일로 저장
                    with open("law.json", "w", encoding="utf-8") as f:
                        json.dump(filtered_data, f, ensure_ascii=False, indent=2)
                    print("\n📁 'filtered_committee_members.json' 파일로 저장 완료.")
                else:
                    print("'row' 키가 없거나 형식이 올바르지 않습니다.")
            else:
                print("API 응답에 유효한 데이터가 없습니다.")
        else:
            print("'nwbpacrgavhjryiph' 키를 찾을 수 없거나 리스트가 아닙니다.")
    except json.JSONDecodeError:
        print("⚠️ JSON 변환 실패. 응답 내용:")
        print(response.text[:1000])
else:
    print(f"API 요청 실패: {response.status_code}")
    print(response.text[:1000])
