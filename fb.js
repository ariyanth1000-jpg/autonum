// ==UserScript==
// @name         Facebook Auto Reg (Ultimate + Login Mode)
// @namespace    https://viayoo.com/xp5r70
// @version      37.0
// @description  Tamimanu UI, OTP sync, Auto Login with OTP as password.
// @author       You
// @match        https://m.facebook.com/*
// @match        https://www.facebook.com/*
// @match        https://limited.facebook.com/*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      api.2oo9.cloud
// ==/UserScript==

(function() {
    'use strict';

    // ==================== ইউজার এজেন্ট লিস্ট ====================
    const userAgents = [
        "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 12; Pixel 6 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.7 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 11; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36"
    ];

    let currentUA = getStorage('fb_current_ua');
    if (!currentUA) {
        currentUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        setStorage('fb_current_ua', currentUA);
    }
    
    try {
        Object.defineProperty(navigator, 'userAgent', { get: function () { return currentUA; } });
        Object.defineProperty(navigator, 'appVersion', { get: function () { return currentUA.replace('Mozilla/', ''); } });
    } catch(e) {}

    // ==================== কনফিগারেশন ====================
    const BASE_URL = "https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api";
    const API_TOKEN = "MHD8VZB8UZ7"; 
    
    const STORAGE_KEY_RID = 'fb_auto_retry_rid';
    const STORAGE_KEY_COUNT = 'fb_auto_retry_count';
    const STORAGE_KEY_STATE = 'fb_script_state'; 
    const STORAGE_KEY_FRESH_PHONE = 'fb_fresh_phone_number'; 
    const STORAGE_KEY_PASSWORD = 'fb_reg_password'; 
    const STORAGE_KEY_NUMBER_HISTORY = 'fb_number_history'; 
    const STORAGE_KEY_SUCCESS_HISTORY = 'fb_success_history'; 
    const STORAGE_KEY_PENDING_RID = 'fb_pending_retry_rid';
    const STORAGE_KEY_UI_POS = 'fb_ui_position'; 
    const STORAGE_KEY_LOGOUT_REDIRECT = 'fb_logout_redirect_active'; 
    
    // লগইন মোডের জন্য নতুন কি (Keys)
    const STORAGE_KEY_LOGIN_MODE = 'fb_login_mode';
    const STORAGE_KEY_LOGIN_NUM = 'fb_login_num';
    const STORAGE_KEY_LOGIN_OTP = 'fb_login_otp';

    const MAX_RETRIES = 50;

    const firstNames = ["John", "Emma", "Michael", "Olivia", "William", "Ava", "James", "Isabella", "Oliver", "Sophia", "Liam", "Mia", "Noah", "Charlotte", "Ethan", "Amelia", "David", "Riley", "Daniel", "Zoe"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

    // ==================== ক্রস-ডোমেইন স্টোরেজ ====================
    function setStorage(key, value) {
        if (typeof GM_setValue === 'function') GM_setValue(key, value);
        else localStorage.setItem(key, value);
    }

    function getStorage(key) {
        if (typeof GM_getValue === 'function') return GM_getValue(key, null);
        else return localStorage.getItem(key);
    }

    function removeStorage(key) {
        if (typeof GM_deleteValue === 'function') GM_deleteValue(key);
        else localStorage.removeItem(key);
    }

    // ==================== ১. ফ্লোটিং কনসোল ====================
    function createConsoleUI() {
        if (document.getElementById('floating-api-console')) return;

        const style = document.createElement('style');
        style.innerHTML = `
            #floating-api-console {
                position: fixed; top: 10px; left: 10px;
                width: 280px; /* একটু চওড়া করা হলো */
                background: rgba(15, 15, 15, 0.95); color: #00ff00;
                font-family: monospace; font-size: 10px; z-index: 9999999;
                border: 1px solid #00ff00; border-radius: 8px;
                display: flex; flex-direction: column;
                box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            }
            
            #floating-api-console.minimized .fac-body { display: none; }
            #floating-api-console.minimized { width: 120px; border-radius: 20px; }

            #fac-header {
                display: flex; justify-content: space-between; align-items: center; 
                padding: 6px 8px; background: #222; color: #fff; font-weight: bold; 
                cursor: grab; border-radius: 6px 6px 0 0; user-select: none;
            }
            
            .fac-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
            
            /* নাম্বার এবং পাসওয়ার্ড একটির নিচে আরেকটি */
            .fac-input-row { display: flex; flex-direction: column; gap: 6px; width: 100%; }
            .fac-input-group { display: flex; flex-direction: column; gap: 2px; width: 100%; }
            .fac-input-group label { font-size: 9px; color: #aaa; }
            .fac-input-group input {
                padding: 6px; font-size: 11px; border-radius: 4px; border: 1px solid #555;
                background: #222; color: #fff; outline: none; width: 100%; box-sizing: border-box;
            }
            .fac-input-group input:focus { border-color: #00ff00; }
            .fac-input-group input.saved-flash { background: #44ff44 !important; color: #000 !important; }

            #fac-latest-log {
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                padding: 4px; background: #111; border-radius: 3px;
                border-left: 2px solid #00ff00; font-size: 10px; font-weight: bold;
            }
            
            /* রেঞ্জ বাটন ২টি করে এক লাইনে, ৪টি ভিজিবল */
            .range-btn-container { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 4px; 
                max-height: 60px; 
                overflow-y: auto;
            }
            .range-btn {
                background: #007bff; color: white; border: none; padding: 5px;
                border-radius: 3px; font-size: 9px; font-weight: bold; cursor: pointer;
                text-align: center;
            }

            /* হেডারে OTP বাটন */
            #fac-otp-btn {
                background: #ff9800; color: black; border: none; padding: 2px 8px;
                border-radius: 4px; font-weight: bold; font-size: 10px; cursor: pointer;
            }

            #fac-hide-btn {
                background: #444; border: none; color: white; border-radius: 50%;
                width: 20px; height: 20px; font-size: 12px; line-height: 1;
                cursor: pointer; display: flex; justify-content: center; align-items: center;
            }
            
            #fac-restore-btn {
                position: fixed; top: 10px; left: 10px;
                width: 40px; height: 40px; background: #00ff00; border-radius: 50%;
                display: none; justify-content: center; align-items: center;
                color: black; font-weight: bold; font-size: 18px; z-index: 9999999;
                box-shadow: 0 2px 5px rgba(0,0,0,0.5); cursor: grab;
            }

            /* ফুল স্ক্রিন নাম্বার লিস্ট */
            #fac-fullscreen {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(10, 10, 10, 0.98); color: #fff;
                z-index: 99999999; display: none; flex-direction: column;
                font-family: monospace;
            }
            #fac-fs-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 15px; background: #222; border-bottom: 1px solid #444;
            }
            #fac-fs-header h2 { margin: 0; font-size: 18px; color: #00ff00; }
            #fac-fs-close { background: red; color: white; border: none; padding: 5px 15px; border-radius: 4px; font-weight: bold; font-size: 14px; cursor: pointer; }
            
            #fac-fs-list { padding: 10px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px; }
            
            .fs-number-card {
                background: #1e1e1e; border: 1px solid #333; border-radius: 6px;
                padding: 10px; display: flex; flex-direction: column; gap: 8px;
            }
            .fs-num-row { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: bold; color: #4caf50; }
            .fs-timer { font-size: 12px; color: #ff9800; font-weight: normal; }
            .fs-invalid .fs-timer { color: #f44336; }
            
            .fs-otp-row { display: flex; justify-content: space-between; align-items: center; background: #000; padding: 8px; border-radius: 4px; border-left: 3px solid #2196f3; }
            .fs-otp-text { color: #fff; font-size: 14px; letter-spacing: 2px; }
            .fs-otp-empty { color: #777; font-size: 12px; }
            
            .fs-actions { display: flex; flex-wrap: wrap; gap: 8px; }
            .fs-btn { flex: 1 1 45%; padding: 8px; border: none; border-radius: 4px; font-weight: bold; font-size: 12px; cursor: pointer; }
            .fs-btn-copy { background: #007bff; color: white; }
            .fs-btn-otp { background: #ff9800; color: black; }
            .fs-btn-login { background: #4caf50; color: white; }
            .fs-btn-del { background: #dc3545; color: white; }
        `;
        document.head.appendChild(style);

        const savedPhone = getStorage(STORAGE_KEY_FRESH_PHONE) || '';
        const savedPass = getStorage(STORAGE_KEY_PASSWORD) || '';

        const consoleDiv = document.createElement('div');
        consoleDiv.id = 'floating-api-console';
        
        const savedPos = JSON.parse(getStorage(STORAGE_KEY_UI_POS) || '{"top": "10px", "left": "10px"}');
        consoleDiv.style.top = savedPos.top;
        consoleDiv.style.left = savedPos.left;

        consoleDiv.innerHTML = `
            <div id="fac-header">
                <span>Tamimanu</span>
                <div style="display:flex; gap:5px; align-items:center;">
                    <button id="fac-otp-btn">OTP</button>
                    <button id="fac-hide-btn">−</button>
                </div>
            </div>
            <div class="fac-body">
                <div class="fac-input-row">
                    <div class="fac-input-group">
                        <label>Number:</label>
                        <input type="text" id="fac-phone-display" value="${savedPhone}" readonly placeholder="None">
                    </div>
                    <div class="fac-input-group">
                        <label>Password:</label>
                        <input type="text" id="fac-pass-input" value="${savedPass}" placeholder="Type Pass...">
                    </div>
                </div>

                <div id="fac-latest-log" class="fac-info">Ready...</div>
                <div id="fac-ranges" class="range-btn-container">Loading...</div>
            </div>
        `;
        document.body.appendChild(consoleDiv);

        // রিস্টোর বাটন তৈরি
        const restoreBtn = document.createElement('div');
        restoreBtn.id = 'fac-restore-btn';
        restoreBtn.innerHTML = '🟢';
        document.body.appendChild(restoreBtn);

        // ফুল স্ক্রিন মডাল
        const fsDiv = document.createElement('div');
        fsDiv.id = 'fac-fullscreen';
        fsDiv.innerHTML = `
            <div id="fac-fs-header">
                <h2>Successful Numbers</h2>
                <button id="fac-fs-close">CLOSE</button>
            </div>
            <div id="fac-fs-list"></div>
        `;
        document.body.appendChild(fsDiv);

        // ---- ড্র্যাগিং লজিক ----
        let isDragging = false; let offsetX, offsetY;
        const header = document.getElementById('fac-header');
        const startDrag = (e) => {
            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const rect = consoleDiv.getBoundingClientRect();
            offsetX = clientX - rect.left; offsetY = clientY - rect.top;
        };
        const onDrag = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            let newLeft = Math.max(0, Math.min(clientX - offsetX, window.innerWidth - consoleDiv.offsetWidth));
            let newTop = Math.max(0, Math.min(clientY - offsetY, window.innerHeight - consoleDiv.offsetHeight));
            consoleDiv.style.left = newLeft + 'px'; consoleDiv.style.top = newTop + 'px';
        };
        const stopDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            setStorage(STORAGE_KEY_UI_POS, JSON.stringify({ top: consoleDiv.style.top, left: consoleDiv.style.left }));
        };

        header.addEventListener('mousedown', startDrag);
        header.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);

        // ---- হাইড/রিস্টোর লজিক ----
        document.getElementById('fac-hide-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            consoleDiv.style.display = 'none';
            restoreBtn.style.top = consoleDiv.style.top; restoreBtn.style.left = consoleDiv.style.left;
            restoreBtn.style.display = 'flex';
        });
        restoreBtn.addEventListener('click', () => {
            restoreBtn.style.display = 'none'; consoleDiv.style.display = 'flex';
        });

        let isRestoreDragging = false; let rOffsetX, rOffsetY;
        restoreBtn.addEventListener('mousedown', (e) => {
            isRestoreDragging = true;
            rOffsetX = e.clientX - restoreBtn.getBoundingClientRect().left;
            rOffsetY = e.clientY - restoreBtn.getBoundingClientRect().top;
        });
        restoreBtn.addEventListener('touchstart', (e) => {
            isRestoreDragging = true;
            rOffsetX = e.touches[0].clientX - restoreBtn.getBoundingClientRect().left;
            rOffsetY = e.touches[0].clientY - restoreBtn.getBoundingClientRect().top;
        }, { passive: false });
        document.addEventListener('mousemove', (e) => {
            if (!isRestoreDragging) return;
            restoreBtn.style.left = Math.max(0, Math.min(e.clientX - rOffsetX, window.innerWidth - 40)) + 'px';
            restoreBtn.style.top = Math.max(0, Math.min(e.clientY - rOffsetY, window.innerHeight - 40)) + 'px';
        });
        document.addEventListener('touchmove', (e) => {
            if (!isRestoreDragging) return;
            e.preventDefault();
            restoreBtn.style.left = Math.max(0, Math.min(e.touches[0].clientX - rOffsetX, window.innerWidth - 40)) + 'px';
            restoreBtn.style.top = Math.max(0, Math.min(e.touches[0].clientY - rOffsetY, window.innerHeight - 40)) + 'px';
        }, { passive: false });
        document.addEventListener('mouseup', () => isRestoreDragging = false);
        document.addEventListener('touchend', () => isRestoreDragging = false);

        // ---- ইনপুট সেভ ----
        document.getElementById('fac-pass-input').addEventListener('input', (e) => {
            setStorage(STORAGE_KEY_PASSWORD, e.target.value.trim());
        });

        // ---- ফুল স্ক্রিন ওপেন/ক্লোজ (OTP বাটনে ক্লিক করলে) ----
        document.getElementById('fac-otp-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            renderFullscreenList();
            fsDiv.style.display = 'flex';
            fetchOTPs(); 
        });
        document.getElementById('fac-fs-close').addEventListener('click', () => {
            fsDiv.style.display = 'none';
        });
    }

    function logToConsole(message, type = 'info') {
        const logDiv = document.getElementById('fac-latest-log');
        if (!logDiv) return;
        const time = new Date().toLocaleTimeString();
        logDiv.innerText = `[${time}] ${message}`;
        logDiv.className = `fac-${type}`;
        logDiv.id = 'fac-latest-log';
    }

    // ==================== ২. নাম্বার সেভ ====================
    function setCurrentPhoneNumber(phoneNumber) {
        setStorage(STORAGE_KEY_FRESH_PHONE, phoneNumber); 
        const phoneDisplay = document.getElementById('fac-phone-display');
        if (phoneDisplay) {
            phoneDisplay.value = phoneNumber;
            phoneDisplay.classList.add('saved-flash');
            setTimeout(() => { phoneDisplay.classList.remove('saved-flash'); }, 1500);
        }
        const rangesDiv = document.getElementById('fac-ranges');
        if (rangesDiv) rangesDiv.style.display = 'none';
        
        logToConsole(`Req Num: ${phoneNumber}`, "success");
    }

    // ==================== ৩. OTP সিঙ্ক ====================
    function fetchOTPs() {
        GM_xmlhttpRequest({
            method: "GET",
            url: `${BASE_URL}/success-otp`,
            headers: { "mauthapi": API_TOKEN },
            onload: function(response) {
                try {
                    const result = JSON.parse(response.responseText);
                    if (result.meta && result.meta.code === 200 && result.data && result.data.otps) {
                        let list = JSON.parse(getStorage(STORAGE_KEY_SUCCESS_HISTORY) || '[]');
                        let updated = false;

                        result.data.otps.forEach(otpObj => {
                            const cleanApiNum = otpObj.number.replace(/\D/g, '');
                            const savedItem = list.find(item => item.number.replace(/\D/g, '') === cleanApiNum);
                            
                            if (savedItem) {
                                const match = otpObj.message.match(/\b\d{4,8}\b/);
                                const code = match ? match[0] : otpObj.message;

                                if (savedItem.otp !== code) {
                                    savedItem.otp = code;
                                    savedItem.status = 'valid'; 
                                    updated = true;
                                }
                            }
                        });

                        if (updated) {
                            setStorage(STORAGE_KEY_SUCCESS_HISTORY, JSON.stringify(list));
                            if(document.getElementById('fac-fullscreen').style.display === 'flex') {
                                renderFullscreenList();
                            }
                        }
                    }
                } catch(e) { console.error("OTP Fetch Error:", e); }
            }
        });
    }

    setInterval(fetchOTPs, 3000);

    // ==================== ৪. ফুল স্ক্রিন রেন্ডারিং ====================
    function renderFullscreenList() {
        const listContainer = document.getElementById('fac-fs-list');
        listContainer.innerHTML = '';
        let list = JSON.parse(getStorage(STORAGE_KEY_SUCCESS_HISTORY) || '[]');

        if (list.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; margin-top:20px; color:#777;">No successful numbers yet.</div>';
            return;
        }

        list.forEach((item, index) => {
            const elapsed = Date.now() - item.addedAt;
            const remaining = 600000 - elapsed; // ১০ মিনিট
            let isInvalid = false;
            let timeString = "";

            if (item.otp) {
                timeString = "✅ OTP Received";
            } else if (remaining <= 0) {
                isInvalid = true;
                timeString = "❌ Invalid (Timeout)";
            } else {
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                timeString = `⏳ ${mins}:${secs < 10 ? '0'+secs : secs} left`;
            }

            const card = document.createElement('div');
            card.className = `fs-number-card ${isInvalid ? 'fs-invalid' : ''}`;
            
            card.innerHTML = `
                <div class="fs-num-row">
                    <span>${item.number}</span>
                    <span class="fs-timer">${timeString}</span>
                </div>
                <div class="fs-otp-row">
                    <span class="${item.otp ? 'fs-otp-text' : 'fs-otp-empty'}">${item.otp ? item.otp : 'Waiting for OTP...'}</span>
                </div>
                <div class="fs-actions">
                    <button class="fs-btn fs-btn-copy">Copy Num</button>
                    <button class="fs-btn fs-btn-otp" ${!item.otp ? 'disabled style="opacity:0.5"' : ''}>Copy OTP</button>
                    <button class="fs-btn fs-btn-login" ${!item.otp ? 'disabled style="opacity:0.5"' : ''}>Login</button>
                    <button class="fs-btn fs-btn-del">Delete</button>
                </div>
            `;

            card.querySelector('.fs-btn-copy').onclick = () => {
                copyToClipboard(item.number);
            };
            
            card.querySelector('.fs-btn-otp').onclick = () => {
                if(item.otp) copyToClipboard(item.otp);
            };

            // ★ লগইন বাটন লজিক ★
            card.querySelector('.fs-btn-login').onclick = () => {
                if(item.otp) {
                    setStorage(STORAGE_KEY_LOGIN_MODE, 'true');
                    setStorage(STORAGE_KEY_LOGIN_NUM, item.number);
                    setStorage(STORAGE_KEY_LOGIN_OTP, item.otp);
                    
                    logToConsole(`Logging in with ${item.number}...`, "success");
                    document.getElementById('fac-fullscreen').style.display = 'none';
                    window.location.href = 'https://m.facebook.com/login/';
                }
            };

            card.querySelector('.fs-btn-del').onclick = () => {
                let currentList = JSON.parse(getStorage(STORAGE_KEY_SUCCESS_HISTORY) || '[]');
                currentList.splice(index, 1);
                setStorage(STORAGE_KEY_SUCCESS_HISTORY, JSON.stringify(currentList));
                renderFullscreenList();
            };

            listContainer.appendChild(card);
        });
    }

    setInterval(() => {
        if(document.getElementById('fac-fullscreen') && document.getElementById('fac-fullscreen').style.display === 'flex') {
            renderFullscreenList();
        }
    }, 1000);


    // ==================== ৫. ক্লিক ও ইনপুট সেটার ====================
    function ultraAggressiveClick(element) {
        if (!element) return;
        element.scrollIntoView({ behavior: 'instant', block: 'center' });
        const rect = element.getBoundingClientRect();
        const x = rect.left + (rect.width / 2);
        const y = rect.top + (rect.height / 2);
        const realElement = document.elementFromPoint(x, y) || element;
        const eventOptions = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
        
        try {
            realElement.dispatchEvent(new PointerEvent('pointerdown', { ...eventOptions, pointerType: 'touch' }));
            realElement.dispatchEvent(new MouseEvent('mousedown', eventOptions));
            realElement.dispatchEvent(new PointerEvent('pointerup', { ...eventOptions, pointerType: 'touch' }));
            realElement.dispatchEvent(new MouseEvent('mouseup', eventOptions));
            realElement.click(); 
            if (realElement.parentElement) realElement.parentElement.click();
        } catch (e) {}
        try {
            element.focus();
            element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        } catch (e) {}
    }

    function setReactInputValue(input, value) {
        if (!input) return;
        input.focus();
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true })); 
        input.blur();
    }

    function setReactSelectValue(select, value) {
        if (!select) return;
        const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
        nativeSelectValueSetter.call(select, value);
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.blur();
    }

    // ==================== ৬. এপিআই কল ====================
    function getNumberFromAPI(rid) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: `${BASE_URL}/getnum`,
                headers: { "Content-Type": "application/json", "mauthapi": API_TOKEN },
                data: JSON.stringify({ rid: rid }),
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.meta && result.meta.code === 200 && result.data && result.data.full_number) {
                            resolve(result.data.full_number);
                        } else { reject(new Error(result.message || "Out of stock")); }
                    } catch (e) { reject(e); }
                },
                onerror: function(error) { reject(error); }
            });
        });
    }

    function fetchLiveData() {
        GM_xmlhttpRequest({
            method: "GET",
            url: `${BASE_URL}/liveaccess`,
            headers: { "mauthapi": API_TOKEN },
            onload: function(liveRes) {
                try {
                    const liveData = JSON.parse(liveRes.json || liveRes.responseText);
                    const rangesDiv = document.getElementById('fac-ranges');
                    if (!rangesDiv) return;
                    
                    rangesDiv.style.display = 'grid';
                    
                    if (liveData.meta && liveData.meta.code === 200 && liveData.data.services) {
                        const fbService = liveData.data.services.find(srv => srv.sid.toLowerCase().includes('facebook'));
                        
                        if (fbService && fbService.ranges && fbService.ranges.length > 0) {
                            const allRanges = fbService.ranges; 
                            rangesDiv.innerHTML = '';
                            
                            allRanges.forEach(rangeStr => {
                                const rid = rangeStr.replace(/X+$/i, '');
                                const btn = document.createElement('button');
                                btn.className = 'range-btn';
                                btn.innerText = rangeStr;
                                btn.dataset.rid = rid; 
                                
                                btn.onclick = async () => {
                                    setStorage(STORAGE_KEY_RID, rid);
                                    setStorage(STORAGE_KEY_STATE, 'identify');
                                    if (parseInt(getStorage(STORAGE_KEY_COUNT) || '0') === 0) {
                                        setStorage(STORAGE_KEY_COUNT, '1');
                                    }
                                    btn.style.display = 'none';
                                    logToConsole(`Req: ${rid}`, "info");
                                    
                                    try {
                                        const phoneNumber = await getNumberFromAPI(rid);
                                        logToConsole(`Got: ${phoneNumber}`, "success");
                                        setCurrentPhoneNumber(phoneNumber); 
                                        fillNumberOnPage(phoneNumber);
                                    } catch (e) {
                                        logToConsole(`Error: ${e.message}`, "error");
                                        btn.style.display = 'block';
                                    }
                                };
                                rangesDiv.appendChild(btn);
                            });

                            const pendingRid = getStorage(STORAGE_KEY_PENDING_RID);
                            if (pendingRid) {
                                const targetBtn = Array.from(rangesDiv.children).find(b => b.dataset.rid === pendingRid);
                                if (targetBtn) {
                                    removeStorage(STORAGE_KEY_PENDING_RID);
                                    logToConsole(`Auto-Starting: ${pendingRid}`, "info");
                                    setTimeout(() => targetBtn.click(), 10); 
                                } else { removeStorage(STORAGE_KEY_PENDING_RID); }
                            } else {
                                const savedRid = getStorage(STORAGE_KEY_RID);
                                const currentState = getStorage(STORAGE_KEY_STATE);
                                if (savedRid && currentState === 'identify' && window.location.href.includes('/login/identify')) {
                                    const retryCount = parseInt(getStorage(STORAGE_KEY_COUNT) || '0');
                                    if (retryCount <= MAX_RETRIES) {
                                        const targetBtn = Array.from(rangesDiv.children).find(b => b.dataset.rid === savedRid);
                                        if (targetBtn) {
                                            logToConsole(`Retry: ${savedRid} (${retryCount}/${MAX_RETRIES})`, "info");
                                            targetBtn.click();
                                        } else {
                                            removeStorage(STORAGE_KEY_RID); removeStorage(STORAGE_KEY_COUNT);
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (e) { console.error("Parse error:", e); }
            }
        });
    }

    // ==================== ৭. রেজিস্ট্রেশন প্রসেস ====================
    function fillNumberOnPage(phoneNumber) {
        let attempts = 0;
        const tryFill = () => {
            const inputField = document.querySelector('input[name="email"]') || document.querySelector('input[type="text"]');
            if (inputField) {
                logToConsole("Filling number...", "info");
                setReactInputValue(inputField, phoneNumber);

                setTimeout(() => {
                    const buttons = Array.from(document.querySelectorAll('button, div[role="button"], input[type="submit"], a'));
                    const targetBtn = buttons.find(el => {
                        const text = (el.innerText || el.value || '').trim().toLowerCase();
                        return text === 'continue' || text === 'search' || text === 'পরবর্তী';
                    });
                    if (targetBtn) {
                        logToConsole("Clicking Continue...", "success");
                        ultraAggressiveClick(targetBtn);
                    } else {
                        logToConsole("Pressing Enter...", "error");
                        inputField.focus();
                        inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                        if (inputField.form) inputField.form.submit();
                    }
                    startSuperFastCheck(phoneNumber);
                }, 50); 
            } else if (attempts < 20) {
                attempts++;
                setTimeout(tryFill, 50);
            }
        };
        tryFill();
    }

    function startSuperFastCheck(phoneNumber) {
        let checks = 0;
        const maxChecks = 200; 

        const checkInterval = setInterval(() => {
            if (getStorage(STORAGE_KEY_STATE) !== 'identify') {
                clearInterval(checkInterval);
                return;
            }
            checks++;
            const pageText = document.body.innerText.toLowerCase();

            if (pageText.includes('create new account') || pageText.includes("couldn't find your account")) {
                clearInterval(checkInterval);
                logToConsole("★ FRESH NUMBER ★ Redirecting...", "success");
                copyToClipboard(phoneNumber);
                setStorage(STORAGE_KEY_STATE, 'reg_name');
                removeStorage(STORAGE_KEY_RID); removeStorage(STORAGE_KEY_COUNT);

                setTimeout(() => {
                    window.location.href = 'https://limited.facebook.com/reg/';
                }, 10); 
                return;
            }
            if (!window.location.href.includes('/login/identify')) {
                clearInterval(checkInterval);
                logToConsole("✖ USED NUMBER - Reloading...", "error");
                window.location.reload(); return;
            }
            if (checks >= maxChecks) {
                clearInterval(checkInterval);
                logToConsole("Timeout! Reloading...", "error");
                window.location.reload();
            }
        }, 20); 
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).catch(() => { fallbackCopy(text); });
        } else { fallbackCopy(text); }
    }
    function fallbackCopy(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text; textArea.style.position = "fixed"; textArea.style.top = "-9999px";
        document.body.appendChild(textArea); textArea.focus(); textArea.select();
        textArea.setSelectionRange(0, 99999);
        try { document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(textArea);
    }

    // ==================== ৮. আল্টিমেট ডাটা ক্লিয়ার ও রিস্টার্ট ====================
    async function clearDataAndRestart() {
        logToConsole("★ SUCCESS! Account Created. Ultimate Clear... ★", "success");
        
        const currentPhone = getStorage(STORAGE_KEY_FRESH_PHONE);
        if (currentPhone) {
            let successList = JSON.parse(getStorage(STORAGE_KEY_SUCCESS_HISTORY) || '[]');
            successList = successList.map(item => typeof item === 'string' ? { number: item, addedAt: Date.now(), otp: null, status: 'pending' } : item);

            if (!successList.some(item => item.number === currentPhone)) {
                successList.unshift({ number: currentPhone, addedAt: Date.now(), otp: null, status: 'pending' });
                setStorage(STORAGE_KEY_SUCCESS_HISTORY, JSON.stringify(successList));
                logToConsole(`Saved to Success List: ${currentPhone}`, "success");
            }
        }

        const currentRid = getStorage(STORAGE_KEY_RID);
        if (currentRid) { setStorage(STORAGE_KEY_PENDING_RID, currentRid); }

        try {
            localStorage.clear();
            sessionStorage.clear();

            const cookies = document.cookie.split(";");
            const domains = ["", window.location.hostname, ".facebook.com", "m.facebook.com", "limited.facebook.com", "www.facebook.com"];
            const paths = ["/", "/login", "/reg", "/recover", "/logout.php", "/privacy", "/policies"];
            
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                domains.forEach(domain => {
                    paths.forEach(path => {
                        let cookieString = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
                        if (domain) cookieString += `;domain=${domain}`;
                        document.cookie = cookieString;
                    });
                });
            }

            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            if (window.indexedDB && indexedDB.databases) {
                const dbs = await indexedDB.databases();
                dbs.forEach(db => { if (db.name) indexedDB.deleteDatabase(db.name); });
            }

            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }
        } catch (e) { console.error("Clear Error:", e); }

        const newUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        setStorage('fb_current_ua', newUA);
        setStorage(STORAGE_KEY_STATE, 'identify');
        setStorage(STORAGE_KEY_LOGOUT_REDIRECT, 'true');
        
        setTimeout(() => {
            window.location.href = 'https://m.facebook.com/logout.php?source=caa_fb_mobile_web_reg_conf_screen';
        }, 100); 
    }

    // ==================== ৯. Registration & Login Page Handlers ====================
    function handleRegPage() {
        let isProcessing = false;
        let lastPageText = "";
        let lastActiveTime = Date.now();

        const processInterval = setInterval(() => {
            if (isProcessing) return;

            const pageText = document.body.innerText.toLowerCase();
            
            if (pageText !== lastPageText) {
                lastPageText = pageText;
                lastActiveTime = Date.now();
            } else {
                if (Date.now() - lastActiveTime > 30000) {
                    logToConsole("Stuck for 30s! Reloading...", "error");
                    window.location.reload();
                    return;
                }
            }

            if (pageText.includes('something went wrong') || pageText.includes('try again later')) {
                logToConsole("Error Page Detected! Reloading in 3s...", "error");
                isProcessing = true;
                setTimeout(() => window.location.reload(), 3000);
                return;
            }

            if (pageText.includes('log in with one tap') || 
                pageText.includes('save your password now') || 
                pageText.includes('confirmation code') || 
                pageText.includes('sent via sms')) {
                isProcessing = true;
                clearInterval(processInterval); 
                clearDataAndRestart(); 
                return;
            }

            const passInput = document.querySelector('input[type="password"], input[name="reg_passwd__"]');
            if (passInput && passInput.offsetHeight > 0) {
                if (passInput.value.length === 0) {
                    isProcessing = true;
                    const savedPass = getStorage(STORAGE_KEY_PASSWORD);
                    if (savedPass) {
                        logToConsole("Filling Password...", "info");
                        setReactInputValue(passInput, savedPass);
                        setTimeout(() => {
                            const signUpBtn = Array.from(document.querySelectorAll('button, div[role="button"], a')).find(el => {
                                const text = (el.innerText || el.value || '').trim().toLowerCase();
                                return (text === 'sign up' || text === 'next' || text === 'submit' || text === 'continue' || text === 'পরবর্তী') && el.offsetHeight > 0;
                            });
                            if (signUpBtn) {
                                logToConsole("Clicking Sign Up...", "success");
                                ultraAggressiveClick(signUpBtn);
                            }
                            isProcessing = false;
                        }, 50); 
                    } else { isProcessing = false; }
                }
                return; 
            }

            const phoneInput = document.querySelector('input[type="tel"], input[name="reg_email__"], input[name="phone_number"]');
            if (phoneInput && phoneInput.offsetHeight > 0) {
                if (phoneInput.value.length < 5) { 
                    isProcessing = true;
                    const savedPhone = getStorage(STORAGE_KEY_FRESH_PHONE);
                    if (savedPhone) {
                        logToConsole(`Filling Phone...`, "info");
                        let phoneToFill = savedPhone.startsWith('+') ? savedPhone.substring(1) : savedPhone;
                        setReactInputValue(phoneInput, phoneToFill);
                        setTimeout(() => {
                            const nextBtn = Array.from(document.querySelectorAll('button, div[role="button"], a')).find(el => {
                                const text = (el.innerText || el.value || '').trim().toLowerCase();
                                return (text === 'next' || text === 'continue' || text === 'পরবর্তী') && el.offsetHeight > 0;
                            });
                            if (nextBtn) ultraAggressiveClick(nextBtn);
                            isProcessing = false;
                        }, 50);
                    } else { isProcessing = false; }
                }
                return;
            }

            const firstNameInput = document.querySelector('input[name="firstname"], input[aria-label="First name"]');
            const lastNameInput = document.querySelector('input[name="lastname"], input[aria-label="Last name"], input[aria-label="Surname"]');
            if (firstNameInput && lastNameInput && firstNameInput.offsetHeight > 0) {
                if (firstNameInput.value.length === 0 || lastNameInput.value.length === 0) {
                    isProcessing = true;
                    logToConsole("Filling Name...", "info");
                    setReactInputValue(firstNameInput, firstNames[Math.floor(Math.random() * firstNames.length)]);
                    setReactInputValue(lastNameInput, lastNames[Math.floor(Math.random() * lastNames.length)]);
                    setTimeout(() => {
                        const nextBtn = Array.from(document.querySelectorAll('button, div[role="button"], a')).find(el => {
                            const text = (el.innerText || el.value || '').trim().toLowerCase();
                            return (text === 'next' || text === 'পরবর্তী') && el.offsetHeight > 0;
                        });
                        if (nextBtn) ultraAggressiveClick(nextBtn);
                        isProcessing = false;
                    }, 50);
                }
                return;
            }

            const yearSelect = document.querySelector('select[name="birthday_year"], select[title="Year"]');
            const monthSelect = document.querySelector('select[name="birthday_month"], select[title="Month"]');
            const daySelect = document.querySelector('select[name="birthday_day"], select[title="Day"]');
            if (pageText.includes("what's your date of birth?")) {
                if (yearSelect && monthSelect && daySelect && yearSelect.options.length > 1) {
                    const currentYear = parseInt(yearSelect.value);
                    if (isNaN(currentYear) || currentYear > 2000 || currentYear === 0) {
                        isProcessing = true;
                        logToConsole("Fixing DOB...", "info");
                        const randomYear = Math.floor(Math.random() * (2000 - 1980 + 1)) + 1980;
                        const randomMonth = Math.floor(Math.random() * 12) + 1;
                        const randomDay = Math.floor(Math.random() * 28) + 1;
                        setReactSelectValue(yearSelect, randomYear);
                        setReactSelectValue(monthSelect, randomMonth);
                        setReactSelectValue(daySelect, randomDay);
                        setTimeout(() => {
                            const nextBtn = Array.from(document.querySelectorAll('button, div[role="button"], a')).find(el => {
                                const text = (el.innerText || el.value || '').trim().toLowerCase();
                                return (text === 'next' || text === 'পরবর্তী') && el.offsetHeight > 0;
                            });
                            if (nextBtn) ultraAggressiveClick(nextBtn);
                            isProcessing = false;
                        }, 50); 
                    }
                }
                return; 
            }

            const isGenderPage = document.body.innerText.includes("What's your gender?");
            if (isGenderPage) {
                const femaleEl = Array.from(document.querySelectorAll('label, span, div, td')).find(el => (el.innerText || '').trim() === "Female");
                if (femaleEl) {
                    const femaleRadio = femaleEl.closest('label')?.querySelector('input[type="radio"]') || 
                                        femaleEl.parentElement?.querySelector('input[type="radio"]') || 
                                        document.querySelector('input[type="radio"][value="1"]');
                    
                    if (femaleRadio && !femaleRadio.checked) {
                        isProcessing = true;
                        logToConsole("Selecting Female...", "info");
                        ultraAggressiveClick(femaleRadio); ultraAggressiveClick(femaleEl);
                        setTimeout(() => {
                            if (femaleRadio && !femaleRadio.checked) {
                                isProcessing = false; return;
                            }
                            const nextBtn = Array.from(document.querySelectorAll('button, div[role="button"], a')).find(el => {
                                const text = (el.innerText || el.value || '').trim().toLowerCase();
                                return (text === 'next' || text === 'পরবর্তী') && el.offsetHeight > 0;
                            });
                            if (nextBtn) ultraAggressiveClick(nextBtn);
                            isProcessing = false;
                        }, 50); 
                    }
                }
                return;
            }

            if (!passInput && !phoneInput && !firstNameInput && !yearSelect && !isGenderPage) {
                const buttons = Array.from(document.querySelectorAll('button, div[role="button"], a'));
                const skipBtn = buttons.find(el => {
                    const text = (el.innerText || el.value || '').trim().toLowerCase();
                    return (text === 'next' || text === 'submit' || text === 'sign up' || text === 'continue' || text === 'ok' || text === 'get started' || text === 'try again') && el.offsetHeight > 0;
                });
                
                if (skipBtn) {
                    isProcessing = true;
                    logToConsole("Unknown page. Skipping forward...", "info");
                    ultraAggressiveClick(skipBtn);
                    setTimeout(() => { isProcessing = false; }, 50);
                    return;
                }
            }

        }, 20); 
    }

    // ★ লগইন পেজ হ্যান্ডলার (নতুন যুক্ত করা হয়েছে) ★
    function handleLoginPage() {
        const isLoginMode = getStorage(STORAGE_KEY_LOGIN_MODE);
        if (isLoginMode !== 'true') return; // যদি লগইন মোডে না থাকে, তবে কিছু করবে না

        const loginNum = getStorage(STORAGE_KEY_LOGIN_NUM);
        const loginOtp = getStorage(STORAGE_KEY_LOGIN_OTP);

        if (!loginNum || !loginOtp) return;

        logToConsole("Login Mode: Filling credentials...", "info");
        
        let attempts = 0;
        const interval = setInterval(() => {
            const emailInput = document.querySelector('input[name="email"], #email');
            const passInput = document.querySelector('input[name="pass"], #pass');

            if (emailInput && passInput) {
                setReactInputValue(emailInput, loginNum);
                setReactInputValue(passInput, loginOtp); // পাসওয়ার্ড বক্সে ওটিপি বসানো হচ্ছে

                setTimeout(() => {
                    const loginBtn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(el => {
                        const text = (el.innerText || el.value || '').trim().toLowerCase();
                        return text === 'log in' || text === 'log in.' || text === 'লগ ইন';
                    });
                    
                    if (loginBtn) {
                        logToConsole("Clicking Login...", "success");
                        ultraAggressiveClick(loginBtn);
                        // কাজ শেষ, লগইন মোড ক্লিয়ার করে দিচ্ছি
                        removeStorage(STORAGE_KEY_LOGIN_MODE);
                        removeStorage(STORAGE_KEY_LOGIN_NUM);
                        removeStorage(STORAGE_KEY_LOGIN_OTP);
                    }
                }, 500);
                clearInterval(interval);
            }
            attempts++;
            if (attempts > 50) clearInterval(interval);
        }, 200);
    }

    // ==================== ১০. রানার ====================
    window.addEventListener('load', () => {
        createConsoleUI();

        const isLogoutRedirecting = getStorage(STORAGE_KEY_LOGOUT_REDIRECT);
        if (isLogoutRedirecting === 'true') {
            logToConsole("Logout Successful! Returning...", "info");
            removeStorage(STORAGE_KEY_LOGOUT_REDIRECT); 
            setTimeout(() => {
                window.location.href = 'https://m.facebook.com/login/identify/';
            }, 10); 
            return;
        }

        const currentState = getStorage(STORAGE_KEY_STATE);
        const isLoginPage = window.location.href.includes('/login/identify');
        const isRegPage = window.location.href.includes('limited.facebook.com/reg') || window.location.href.includes('reg/');
        
        // ★ চেক করা হচ্ছে আমরা কি `https://m.facebook.com/login/` পেজে আছি কি না ★
        const isActualLoginPage = window.location.pathname === '/login/' || window.location.pathname === '/login';

        if (isActualLoginPage) {
            handleLoginPage();
        } else if (isLoginPage) {
            fetchLiveData();
            setInterval(fetchLiveData, 20000);
        } else if (isRegPage || currentState === 'reg_name' || currentState === 'done') {
            const rangesDiv = document.getElementById('fac-ranges');
            if (rangesDiv) rangesDiv.style.display = 'none';
            handleRegPage();
        }
    });

})();
