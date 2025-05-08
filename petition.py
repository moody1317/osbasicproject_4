# 청원 처리 현황 
import requests
import json

# 1. API URL 설정
api_url = "https://open.assembly.go.kr/portal/openapi/ncryefyuaflxnqbqo"

# 2. API 키 설정
api_key = "927928bf24af47d4afa7b805ed0bf4fc"

# 3. 요청 파라미터 설정 (AGE는 21, 22)
params = {
    "KEY": api_key,
    "Type": "json",
    "pIndex": "1",
    "pSize": "1000",
    "AGE": "22"  # 22대 의안만
}

# 4. API 요청 보내기
response = requests.get(api_url, params=params)

# 5. 응답 분석 및 필터링
if response.status_code == 200:
    try:
        data = response.json()
        if 'ncryefyuaflxnqbqo' in data and isinstance(data['ncryefyuaflxnqbqo'], list):
            api_list = data['ncryefyuaflxnqbqo']
            
            if len(api_list) > 1:
                second_item = api_list[1]
                if isinstance(second_item, dict) and 'row' in second_item:
                    rows = second_item['row']
                    
                    print(f"'row' 데이터 개수: {len(rows)}")

                    # 필터링할 필드
                    target_fields = ["BILL_NO", "BILL_NAME", "PROPOSER", "PROC_RESULT_CD"]

                    # 필드 매핑 결과 및 필터링된 데이터
                    filtered_rows = []
                    for row in rows:
                        filtered_row = {field: row.get(field, "") for field in target_fields}
                        filtered_rows.append(filtered_row)
                    
                    filtered_data = {"ncryefyuaflxnqbqo": filtered_rows}

                    # 출력
                    print("\n필터링된 결과:")
                    print(json.dumps(filtered_data, indent=4, ensure_ascii=False))

                    # 파일 저장
                    with open("petition.json", "w", encoding="utf-8") as f:
                        json.dump(filtered_data, f, ensure_ascii=False, indent=2)

                    print("\n📁 'filtered_committee_members.json' 파일로 저장 완료.")
                else:
                    print("'row' 키가 없거나 형식이 올바르지 않습니다.")
            else:
                print("API 응답에 유효한 데이터가 없습니다.")
        else:
            print("'ncryefyuaflxnqbqo' 키를 찾을 수 없거나 리스트가 아닙니다.")
    except json.JSONDecodeError:
        print("⚠️ JSON 변환 실패. 응답 내용:")
        print(response.text[:1000])
else:
    print(f"API 요청 실패: {response.status_code}")
    print(response.text[:1000])
