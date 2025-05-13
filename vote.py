import requests
import json
import os
import time

# API 기본 정보
api_key = "927928bf24af47d4afa7b805ed0bf4fc"
vote_api_url = "https://open.assembly.go.kr/portal/openapi/nojepdqqaweusdfbi"  # 투표 정보 API 주소

# 먼저 all.py에서 생성한 JSON 파일에서 BILL_ID 목록 가져오기
def get_bill_ids_from_file():
    try:
        filename_list = {
            "all": "all.json",
            "cost": "cost.json",
            "cosstly": "cosstly.json",
            "etc": "etc.json"
        }

        bill_ids_list = {}
        total_bills = 0

        for key in filename_list:
            filepath = filename_list[key]

            if not os.path.exists(filepath):
                print(f"파일 '{filepath}'이 존재하지 않습니다.")
                continue

            with open(filepath, "r", encoding="utf-8") as f:
                file_data = json.load(f)

            bill_ids = []
            if "data" in file_data:
                for item in file_data["data"]:
                    if item.get("BILL_ID"):
                        bill_ids.append(item["BILL_ID"])

            if not bill_ids:
                print(f"⚠️ '{filepath}'에는 유효한 BILL_ID가 없습니다. 건너뜁니다.")
                continue

            total_bills += len(bill_ids)
            bill_ids_list[filepath] = bill_ids

            print(f"'{filepath}'에서 {len(bill_ids)}개의 BILL_ID를 가져왔습니다.")
            print("가져온 BILL_ID 목록 (최대 5개):")
            for i, bill_id in enumerate(bill_ids[:5]):
                print(f"{i+1}. {bill_id}")

        print(f"\n📊 총 유효 BILL_ID 수: {total_bills}개")

        return bill_ids_list

    except Exception as e:
        print(f"파일 읽기 오류: {e}")
        return None

# 투표 정보 API 호출
def get_vote_data(bill_id):
    # API 요청 파라미터 설정
    params = {
        "KEY": api_key,
        "Type": "json",
        "pIndex": "1",
        "pSize": "1000",
        "AGE": "22",         # 22대 국회로 설정
        "BILL_ID": bill_id   # 파일에서 가져온 BILL_ID
    }
    
    print(f"\n투표 정보 API 호출 중... (BILL_ID: {bill_id})")
    response = requests.get(vote_api_url, params=params)
    
    if response.status_code == 200:
        try:
            data = response.json()
            
            # API 이름 추출 (URL에서)
            api_name = vote_api_url.split('/')[-1]
            
            # 일반적인 API 응답 구조 처리
            if api_name in data:
                print("✅ API 호출 성공!")
                api_data = data[api_name]
                
                if isinstance(api_data, list) and len(api_data) > 1:
                    # 두 번째 항목에서 'row' 데이터 추출
                    second_item = api_data[1]
                    
                    if isinstance(second_item, dict) and 'row' in second_item:
                        rows = second_item['row']
                        print(f"총 {len(rows)}개의 투표 데이터를 가져왔습니다.")
                        
                        # 필드 매핑 정의
                        field_mapping = {
                            "HG_NM": ["HG_NM", "MONA_NM", "NAMES", "NAME"],
                            "POLY_NM": ["POLY_NM", "POLY", "POLYCD", "POLY_CD", "PARTY_NM"],
                            "BILL_ID": ["BILL_ID", "BILLID", "BILL_KEY"],
                            "BILL_NAME": ["BILL_NAME", "BILL_NM", "BILLNM", "BILL_TITLE"],
                            "RESULT_VOTE_MOD": ["RESULT_VOTE_MOD", "RESULT", "VOTE_RESULT", "VOTING_RESULT"],
                            "BILL_NO": ["BILL_NO", "BILLNO"],
                            "VOTE_DATE": ["VOTE_DATE", "VOTE", "VOTEDATE"]
                        }
                        
                        # 실제 필드 이름 확인 (첫 번째 항목에서)
                        actual_field_names = {}
                        if len(rows) > 0:
                            print("\n필드 매핑 확인:")
                            for target_field, possible_fields in field_mapping.items():
                                for field in possible_fields:
                                    if field in rows[0]:
                                        actual_field_names[target_field] = field
                                        print(f"- {target_field} -> {field}")
                                        break
                                if target_field not in actual_field_names:
                                    print(f"- {target_field} -> 매칭되는 필드를 찾을 수 없음")
                        
                        # 필요한 필드만 추출
                        filtered_rows = []
                        for row in rows:
                            filtered_row = {}
                            for target_field, actual_field in actual_field_names.items():
                                filtered_row[target_field] = row.get(actual_field, "")
                            filtered_rows.append(filtered_row)
                        
                        return filtered_rows
                    else:
                        print("'row' 키를 찾을 수 없습니다.")
                else:
                    print("API 응답 구조가 예상과 다릅니다.")
            
            # 오류 응답인 경우
            elif 'RESULT' in data and 'CODE' in data['RESULT']:
                print(f"오류: {data['RESULT']['CODE']} - {data['RESULT']['MESSAGE']}")
            else:
                print("예상치 못한 응답 구조입니다.")
        
        except json.JSONDecodeError:
            print("JSON 파싱 오류. 응답이 JSON 형식이 아닙니다.")
    else:
        print(f"API 요청 실패: {response.status_code}")
    
    return None

def main():
    # BILL_ID 목록 딕셔너리 형태로 가져오기
    bill_ids_dict = get_bill_ids_from_file()
    
    if not bill_ids_dict or len(bill_ids_dict) == 0:
        print("BILL_ID 목록을 가져오지 못했습니다.")
        return

    for filename, bill_ids in bill_ids_dict.items():
        print(f"\n=== 파일 '{filename}'의 BILL_ID {len(bill_ids)}개 처리 시작 ===")

        all_vote_data = []

        for i, bill_id in enumerate(bill_ids):
            vote_data = get_vote_data(bill_id)
            
            if vote_data:
                all_vote_data.extend(vote_data)
                print(f"[{filename}] 누적 투표 데이터: {len(all_vote_data)}개")

                if i == 0:  # 첫 번째 의안의 결과 예시
                    print("\n---- 투표 결과 예시 ----")
                    for j, vote in enumerate(vote_data[:min(5, len(vote_data))]):
                        print(f"\n투표 {j+1}:")
                        for field in ["HG_NM", "POLY_NM", "BILL_ID", "BILL_NAME", "RESULT_VOTE_MOD"]:
                            print(f"- {field}: {vote.get(field, '')}")
            
            if i < len(bill_ids) - 1:
                print("다음 API 호출 전 1초 대기...")
                time.sleep(1)

        if all_vote_data:
            # 저장 파일 이름 결정: 예) vote_cost.json
            output_name = filename.replace(".json", "")
            output_filename = f"vote_{output_name}.json"

            output_data = {
                "vote_data": all_vote_data
            }

            with open(output_filename, "w", encoding="utf-8") as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)

            print(f"\n✅ '{output_filename}' 파일로 {len(all_vote_data)}개의 투표 데이터가 저장되었습니다.")
        else:
            print(f"\n❗ '{filename}'에 대해 저장할 투표 데이터가 없습니다.")

# 프로그램 실행
if __name__ == "__main__":
    main()
