import time
import os
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pyperclip  # 클립보드 사용을 위한 라이브러리
import pyautogui
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# 엑셀 파일 경로
excel_file_path = r'C:\Users\Yunjadong\Desktop\네이버카페글쓰기.xlsx'

# 엑셀 파일 읽기
try:
    df = pd.read_excel(excel_file_path)
    print(f"엑셀 파일을 성공적으로 읽었습니다. 총 {len(df)} 개의 행이 있습니다.")
except Exception as e:
    print(f"엑셀 파일 읽기 오류: {e}")
    exit(1)

# 네이버 로그인 정보 설정
naver_id = "yunjadong"
naver_pw = "test1234"

# 웹드라이버 설정
options = webdriver.ChromeOptions()
# options.add_argument('--headless')  # 필요시 헤드리스 모드 활성화
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')

# 웹드라이버 초기화
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

try:
    # 네이버 로그인 페이지 접속
    driver.get('https://nid.naver.com/nidlogin.login')
    time.sleep(2)  # 페이지 로딩 대기
    
    # 아이디 입력 필드 찾기
    id_field = driver.find_element(By.ID, 'id')
    id_field.click()
    
    # 클립보드에 아이디 복사 후 붙여넣기
    pyperclip.copy(naver_id)
    id_field.send_keys(Keys.CONTROL, 'v')
    time.sleep(1)
    
    # 비밀번호 입력 필드 찾기
    pw_field = driver.find_element(By.ID, 'pw')
    pw_field.click()
    
    # 클립보드에 비밀번호 복사 후 붙여넣기
    pyperclip.copy(naver_pw)
    pw_field.send_keys(Keys.CONTROL, 'v')
    time.sleep(1)
    
    # 로그인 버튼 클릭
    login_button = driver.find_element(By.ID, 'log.login')
    login_button.click()
    
    # 로그인 완료 대기
    time.sleep(3)
    
    print("네이버 로그인 성공!")
    
    # 각 행의 데이터로 글 작성 시작
    for index, row in df.iterrows():
        if index == 0:  # 첫 번째 행은 헤더일 수 있으므로 건너뛰기
            continue
            
        # 데이터 추출
        title = row[0]  # A열: 제목
        content = row[1]  # B열: 내용
        image_path = row[2]  # C열: 사진 경로
        location = row[3]  # D열: 장소명
        
        print(f"\n{index}번째 행 처리 중: 제목 - {title}")
        
        # 네이버 카페 게시판 글쓰기 페이지로 이동
        driver.get('https://cafe.naver.com/ca-fe/cafes/30883250/menus/1/articles/write?boardType=L')
        time.sleep(3)  # 페이지 로딩 대기
        
        # 제목 입력 필드 찾기
        try:
            title_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'textarea.textarea_input'))
            )
            title_field.click()
            
            # 제목 입력
            title_field.send_keys(title)
            print(f"제목 '{title}' 입력 완료")
            time.sleep(1)
        except Exception as e:
            print(f"제목 입력 중 오류 발생: {e}")
            driver.save_screenshot(f"제목입력오류_{index}.png")
            continue  # 다음 행으로 넘어가기
        
        # 내용 입력 필드 찾기
        try:
            content_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'span.se-placeholder.__se_placeholder.se-ff-system.se-fs15.se-placeholder-focused'))
            )
            content_field.click()
            
            # ActionChains를 이용하여 내용 입력
            actions = ActionChains(driver)
            actions.send_keys(content).perform()
            print(f"내용 입력 완료")
            time.sleep(1)
        except Exception as e:
            print(f"내용 입력 중 오류 발생: {e}")
            driver.save_screenshot(f"내용입력오류_{index}.png")
        
        # 이미지 경로가 있고 파일이 존재하는 경우에만 이미지 추가
        if pd.notna(image_path) and os.path.exists(image_path):
            try:
                # 사진 추가 버튼 클릭
                image_button = driver.find_element(By.CSS_SELECTOR, 'button[data-name="image"]')
                image_button.click()
                time.sleep(2)  # 2초 기다리기
                
                # 클립보드에 파일 경로 복사
                pyperclip.copy(image_path)
                time.sleep(1)  # 잠시 대기
                
                # Ctrl + V를 눌러서 붙여넣기
                pyautogui.hotkey('ctrl', 'v')
                time.sleep(1)  # 잠시 대기
                
                # 엔터 키를 눌러서 확인
                pyautogui.press('enter')
                time.sleep(2)
                print(f"이미지 '{image_path}' 추가 완료")
            except Exception as e:
                print(f"이미지 추가 중 오류 발생: {e}")
                driver.save_screenshot(f"이미지추가오류_{index}.png")
        
        # 장소명이 있는 경우에만 장소 추가
        if pd.notna(location) and location.strip() != "":
            try:
                # 장소 추가 버튼 클릭
                location_button = driver.find_element(By.CSS_SELECTOR, 'button[data-name="map"]')
                location_button.click()
                time.sleep(2)
                
                # 장소명 입력
                location_input = driver.find_element(By.CSS_SELECTOR, 'input[placeholder="장소명을 입력하세요."]')
                location_input.send_keys(location)
                location_input.send_keys(Keys.ENTER)
                time.sleep(3)
                
                # 검색 결과에서 첫 번째 항목 선택
                try:
                    # 첫 번째 검색 결과 항목 찾기
                    first_result = driver.find_element(By.CSS_SELECTOR, 'li.se-place-map-search-result-item:first-child')
                    first_result.click()
                    time.sleep(1)
                    
                    # 첫 번째 항목의 추가 버튼 클릭
                    add_button = first_result.find_element(By.CSS_SELECTOR, 'button.se-place-add-button')
                    add_button.click()
                    time.sleep(2)
                    
                    # 확인 버튼 클릭
                    confirm_button = driver.find_element(By.CSS_SELECTOR, 'button.se-popup-button.se-popup-button-confirm')
                    confirm_button.click()
                    time.sleep(2)
                    print(f"장소 '{location}' 추가 완료")
                except Exception as e:
                    print(f"장소 검색 결과 선택 중 오류 발생: {e}")
                    driver.save_screenshot(f"장소선택오류_{index}.png")
            except Exception as e:
                print(f"장소 추가 중 오류 발생: {e}")
                driver.save_screenshot(f"장소추가오류_{index}.png")
        
        # 임시등록 또는 등록 버튼 클릭
        try:
            # 임시등록 버튼 클릭
            temp_save_button = driver.find_element(By.CSS_SELECTOR, 'button.btn_temp_save')
            temp_save_button.click()
            print(f"{index}번째 행 글 임시등록 완료")
            time.sleep(3)  # 버튼 클릭 후 대기
            
            # 여기에 실제 등록 버튼 클릭 코드를 추가할 수 있습니다.
            # 테스트 단계에서는 임시등록만 하고, 실제 등록은 주석 처리해두세요.
            """
            register_button = driver.find_element(By.CSS_SELECTOR, 'button.btn_register')
            register_button.click()
            print(f"{index}번째 행 글 등록 완료")
            time.sleep(3)
            """
        except Exception as e:
            print(f"글 등록 중 오류 발생: {e}")
            driver.save_screenshot(f"글등록오류_{index}.png")
        
        # 다음 글 작성을 위해 잠시 대기
        time.sleep(2)
    
    print("\n모든 행의 처리가 완료되었습니다.")
    
except Exception as e:
    print(f"전체 프로세스 중 오류 발생: {e}")
    
finally:
    # 작업 완료 후 브라우저 종료 (선택적)
    input("작업이 완료되었습니다. 브라우저를 닫으려면 아무 키나 누르세요...")
    driver.quit()

