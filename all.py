import requests
import json

# API 기본 정보
api_key = "927928bf24af47d4afa7b805ed0bf4fc"
api_url = "https://open.assembly.go.kr/portal/openapi/nxjuyqnxadtotdrbw"  # 새로운 API 주소

# API 요청 파라미터 설정
params = {
    "KEY": api_key,
    "Type": "json",
    "pIndex": "1",
    "pSize": "1000",
    "AGE": "22"  # 22대 국회
}

# API 요청
print("국회 API 호출 중...")
response = requests.get(api_url, params=params)

# 응답 확인
if response.status_code == 200:
    try:
        data = response.json()
        
        print("\n최상위 키:")
        print(list(data.keys()))
        
        api_name = api_url.split('/')[-1]
        
        if api_name in data:
            api_data = data[api_name]
            
            if isinstance(api_data, list) and len(api_data) > 1:
                second_item = api_data[1]
                
                if isinstance(second_item, dict) and 'row' in second_item:
                    rows = second_item['row']
                    print(f"총 {len(rows)}개의 데이터를 가져왔습니다.")
                    
                    if len(rows) > 0:
                        print("\n첫 번째 항목의 모든 필드:")
                        for key, value in rows[0].items():
                            print(f"- {key}: {value}")
                    
                    # 원하는 필드 추출
                    filtered_data = []
                    for row in rows:
                        filtered_data.append({
                            "AGE": row.get("AGE", ""),
                            "BILL_ID": row.get("BILL_ID", ""),
                            "PROC_RESULT_CD": row.get("PROC_RESULT_CD", ""),  # 의결결과
                            "PROPOSER": row.get("PROPOSER", ""),             # 제안자
                            "DETAIL_LINK": row.get("LINK_URL", "")        # 의안 상세 URL
                        })
                    
                    # 결과 출력
                    print("\n요약된 안건 정보 (일부):")
                    for i, item in enumerate(filtered_data[:5]):
                        print(f"{i+1}. AGE: {item['AGE']}, BILL_ID: {item['BILL_ID']}, PROC_RESULT_CD: {item['PROC_RESULT_CD']}, PROPOSER: {item['PROPOSER']}, LINK: {item['DETAIL_LINK']}")
                    
                    # JSON 저장
                    output_data = {"data": filtered_data}
                    with open("all.json", "w", encoding="utf-8") as f:
                        json.dump(output_data, f, ensure_ascii=False, indent=2)
                    
                    print(f"\n✅ {len(filtered_data)}개의 정보가 'all.json' 파일로 저장되었습니다.")
                else:
                    print("'row' 키를 찾을 수 없습니다.")
            else:
                print("API 응답 구조가 예상과 다릅니다.")
        
        elif 'RESULT' in data and 'CODE' in data['RESULT']:
            print(f"오류: {data['RESULT']['CODE']} - {data['RESULT']['MESSAGE']}")
            print("\n사용된 파라미터:")
            for key, value in params.items():
                print(f"- {key}: {value}")
        else:
            print("예상치 못한 응답 구조입니다.")
            print(json.dumps(data, indent=2, ensure_ascii=False)[:500])
    
    except json.JSONDecodeError:
        print("JSON 파싱 오류")
        print(response.text[:500])
else:
    print(f"API 요청 실패: {response.status_code}")
    print(response.text[:500])
