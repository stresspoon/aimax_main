# **📝 네이버 블로그 자동화 프로그램 개발 가이드**

## **💡 핵심 코드 구조**

### **✅ UI 클래스 정의**

python  
class BlogPoster(QWidget):  
    def \_\_init\_\_(self):  
        super().\_\_init\_\_()  
        self.setWindowTitle("네이버 블로그 자동 포스팅")  
        self.setFixedSize(900, 700\)  
        self.initUI()

---

### **✅ 글 생성 함수 (GPT 예시)**

python  
def generate\_gpt\_content(self, prompt, api\_key):  
    from openai import OpenAI  
    client \= OpenAI(api\_key=api\_key)  
    response \= client.chat.completions.create(  
        model="gpt-4o",  
        messages=\[{"role": "user", "content": prompt}\],  
        max\_tokens=2048  
    )  
    return response.choices\[0\].message.content

---

### **✅ 이미지 생성 함수 (GPT 예시)**

python

def generate\_gpt\_image(self, prompt, api\_key):  
    import openai, tempfile, requests  
    client \= openai.OpenAI(api\_key=api\_key)  
    response \= client.images.generate(  
        model="dall-e-3",  
        prompt=prompt,  
        n=1,  
        size="1024x1024"  
    )  
    image\_url \= response.data\[0\].url  
    img\_resp \= requests.get(image\_url)  
    temp\_file \= tempfile.NamedTemporaryFile(delete=False, suffix='.png')  
    temp\_file.write(img\_resp.content)  
    temp\_file.close()  
    return temp\_file.name

---

### **✅ 실행 함수: 글 \+ 이미지 \+ 포스팅**

python  
def submit(self):  
    \# API 선택에 따라 글 생성  
    if self.claude\_radio.isChecked():  
        content \= self.generate\_claude\_content(enhanced\_prompt, api\_key)  
    elif self.gpt\_radio.isChecked():  
        content \= self.generate\_gpt\_content(enhanced\_prompt, api\_key)

    \# 이미지 생성 함수 할당  
    if use\_image\_gen:  
        image\_gen\_func \= lambda prompt: self.generate\_gpt\_image(prompt, api\_key)

    \# 실제 포스팅 실행  
    from Code import naverblog  
    naverblog.write(  
        id=self.id\_input.text(),  
        pw=self.pw\_input.text(),  
        content=content,  
        publish\_type=publish\_type,  
        publish\_date=publish\_datetime,  
        use\_image\_gen=use\_image\_gen,  
        api\_key=api\_key,  
        photo\_paths=photo\_paths,  
        image\_gen\_func=image\_gen\_func  
    )

---

### **✅ Selenium 자동 업로드 구조 ([naverblog.py](http://naverblog.py))**

\# main.py 또는 naverblog.py 내부 정리된 코드 구조

from selenium import webdriver  
from selenium.webdriver.chrome.service import Service  
from selenium.webdriver.common.by import By  
from selenium.webdriver.common.keys import Keys  
from selenium.webdriver.common.action\_chains import ActionChains  
from webdriver\_manager.chrome import ChromeDriverManager  
import pyperclip  
import pyautogui  
import os  
import time

\# 로그인 함수  
def login(driver, naver\_id, naver\_pw):  
    driver.get("\<https://nid.naver.com/nidlogin.login\>")

    pyperclip.copy(naver\_id)  
    driver.find\_element(By.CSS\_SELECTOR, "\#id").click()  
    driver.find\_element(By.CSS\_SELECTOR, "\#id").send\_keys(Keys.CONTROL \+ "v")  
    time.sleep(0.5)

    pyperclip.copy(naver\_pw)  
    driver.find\_element(By.CSS\_SELECTOR, "\#pw").click()  
    driver.find\_element(By.CSS\_SELECTOR, "\#pw").send\_keys(Keys.CONTROL \+ "v")  
    time.sleep(0.5)

    driver.find\_element(By.CSS\_SELECTOR, "\#log\\\\\\\\.login").click()  
    time.sleep(1)

    return driver.current\_url \!= "\<https://nid.naver.com/nidlogin.login\>"

\# 제목 입력 함수  
def write\_title(driver, title):  
    selectors \= \[  
        ".se-section-documentTitle",  
        "\[data-placeholder='제목을 입력하세요'\]",  
        ".se-documentTitle",  
        "div\[contenteditable='true'\]\[data-placeholder\*='제목'\]"  
    \]  
    for selector in selectors:  
        try:  
            title\_element \= driver.find\_element(By.CSS\_SELECTOR, selector)  
            title\_element.click()  
            pyperclip.copy(title)  
            actions \= ActionChains(driver)  
            actions.key\_down(Keys.CONTROL).send\_keys('v').key\_up(Keys.CONTROL).send\_keys(Keys.ENTER).perform()  
            time.sleep(2)  
            return  
        except:  
            continue  
    raise Exception("제목 입력 실패")

\# 볼드 토글

def toggle\_bold(driver):  
    driver.find\_element(By.CSS\_SELECTOR, ".se-bold-toolbar-button").click()  
    time.sleep(0.5)

\# 텍스트 볼드 파싱

def process\_bold\_text(text):  
    parts \= \[\]  
    current \= ""  
    bold \= False  
    i \= 0  
    while i \< len(text):  
        if text\[i:i+2\] \== "\*\*":  
            if current:  
                parts.append(('bold' if bold else 'text', current))  
            current \= ""  
            bold \= not bold  
            i \+= 2  
        else:  
            current \+= text\[i\]  
            i \+= 1  
    if current:  
        parts.append(('bold' if bold else 'text', current))  
    return parts

\# 본문 텍스트 입력

def write\_text(driver, text):  
    parts \= process\_bold\_text(text)  
    for ttype, content in parts:  
        if ttype \== 'bold':  
            toggle\_bold(driver)  
        pyperclip.copy(content)  
        actions \= ActionChains(driver)  
        actions.key\_down(Keys.CONTROL).send\_keys('v').key\_up(Keys.CONTROL).perform()  
        time.sleep(0.5)  
        if ttype \== 'bold':  
            toggle\_bold(driver)

\# 인용구 삽입

def write\_quote(driver, quote\_text):  
    driver.find\_element(By.CSS\_SELECTOR, ".se-toolbar-item-insert-quotation .se-document-toolbar-select-option-button").click()  
    time.sleep(1)  
    driver.find\_element(By.CSS\_SELECTOR, ".se-toolbar-option-insert-quotation-quotation\_underline-button").click()  
    time.sleep(1)  
    pyperclip.copy(quote\_text)  
    actions \= ActionChains(driver)  
    actions.key\_down(Keys.CONTROL).send\_keys('v').key\_up(Keys.CONTROL).send\_keys(Keys.ARROW\_DOWN, Keys.ARROW\_DOWN, Keys.ENTER).perform()  
    time.sleep(1)

\# 이미지 삽입

def insert\_image(driver, image\_path):  
    try:  
        driver.find\_element(By.CSS\_SELECTOR, ".se-toolbar-item-image").click()  
        time.sleep(2)  
        pyperclip.copy(os.path.abspath(image\_path))  
        pyautogui.hotkey('ctrl', 'v')  
        time.sleep(1)  
        pyautogui.press('enter')  
        time.sleep(3)  
        os.remove(image\_path)  
    except Exception as e:  
        print(f"이미지 삽입 실패: {e}")  
        try:  
            os.remove(image\_path)  
        except:  
            pass

\# 글쓰기 엔트리 함수

def write(id, pw, content, publish\_type, publish\_date, photo\_paths, use\_image\_gen, image\_gen\_func, api\_key):  
    driver \= webdriver.Chrome(service=Service(ChromeDriverManager().install()))  
    login\_success \= login(driver, id, pw)  
    if not login\_success:  
        raise Exception("네이버 로그인 실패")

    \# 블로그 글쓰기 페이지 진입 생략됨  
    \# write\_title(driver, ...), write\_text(driver, ...), insert\_image(driver, ...) 등 호출  
    \# publish\_type: 1=임시저장, 2=즉시발행 등  
      
    \# 저장 버튼 클릭 예시:  
    if publish\_type \== 1:  
        driver.find\_element(By.CSS\_SELECTOR, ".save\_btn\_\_bzc5B").click()  
    elif publish\_type \== 2:  
        driver.find\_element(By.CSS\_SELECTOR, ".publish\_btn\_\_m9KHH").click()  
      
    time.sleep(2)  
    driver.quit()

---

## **📁 blog\_settings.json 예시**

json

  "naver\_id": "example",  
  "naver\_pw": "password",  
  "selected\_api": "gpt",  
  "gpt\_key": "sk-xxxx",  
  "use\_image\_gen": true,  
  "save\_option": 1,  
  "prompt": "사랑니 발치 후 주의사항을 알려주세요."  
}

---

## **📌 설치 명령어**

bash

pip install pyqt5 selenium webdriver-manager openai anthropic google-generativeai pillow

---

## **✅ 개발 팁**

* 프롬프트에 `[이미지]` 태그 포함 시 해당 부분을 AI 이미지로 생성  
* 예약 발행 기능을 위해 QDateTimeEdit 사용  
* Selenium 사용 시 로그인 대기시간 유의  
* 모든 주요 작업마다 `self.log_message()`로 UI 로그 표시

