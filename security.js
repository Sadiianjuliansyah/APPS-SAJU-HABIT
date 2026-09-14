"use strict";

window.SajuHabitSecurity = (() => {
    const PIN_STORAGE_KEY = "saju_habit_private_pin_v1";
    const PIN_LENGTH = 6;

    let currentMode = "setup";

    let elements = {};

    document.addEventListener(
        "DOMContentLoaded",
        initializeSecurity
    );

    function initializeSecurity() {
        elements = {
            screen: document.getElementById(
                "securityScreen"
            ),

            app: document.getElementById("app"),

            form: document.getElementById("pinForm"),

            title: document.getElementById(
                "securityTitle"
            ),

            description: document.getElementById(
                "securityDescription"
            ),

            pinInput: document.getElementById(
                "pinInput"
            ),

            confirmPinInput: document.getElementById(
                "confirmPinInput"
            ),

            confirmPinLabel: document.getElementById(
                "confirmPinLabel"
            ),

            message: document.getElementById(
                "pinMessage"
            ),

            submitButton: document.getElementById(
                "pinSubmitButton"
            )
        };

        if (
            !elements.screen ||
            !elements.app ||
            !elements.form
        ) {
            console.error(
                "Elemen keamanan Saju Habit tidak ditemukan."
            );

            return;
        }

        elements.app.classList.add("is-hidden");
        elements.screen.classList.remove("is-hidden");

        bindSecurityEvents();

        if (hasSavedPin()) {
            configureUnlockMode();
        } else {
            configureSetupMode();
        }

        window.setTimeout(() => {
            elements.pinInput.focus();
        }, 120);
    }

    function bindSecurityEvents() {
        elements.form.addEventListener(
            "submit",
            handlePinSubmit
        );

        [
            elements.pinInput,
            elements.confirmPinInput
        ].forEach((input) => {
            input.addEventListener("input", () => {
                input.value = input.value
                    .replace(/\D/g, "")
                    .slice(0, PIN_LENGTH);

                clearMessage();
            });
        });
    }

    async function handlePinSubmit(event) {
        event.preventDefault();
        clearMessage();

        const pin = elements.pinInput.value;
        const confirmation =
            elements.confirmPinInput.value;

        if (!isValidPin(pin)) {
            showError("PIN harus terdiri dari 6 digit angka.");
            return;
        }

        elements.submitButton.disabled = true;

        try {
            if (currentMode === "setup") {
                await createFirstPin(pin, confirmation);
                return;
            }

            if (currentMode === "unlock") {
                await verifyUnlockPin(pin);
                return;
            }

            if (currentMode === "change-verify") {
                await verifyCurrentPin(pin);
                return;
            }

            if (currentMode === "change-new") {
                await saveNewPin(pin, confirmation);
            }
        } catch (error) {
            console.error(
                "Proses PIN Saju Habit gagal:",
                error
            );

            showError(
                "PIN gagal diproses. Coba buka ulang aplikasi."
            );
        } finally {
            elements.submitButton.disabled = false;
        }
    }

    async function createFirstPin(pin, confirmation) {
        if (!isValidPin(confirmation)) {
            showError(
                "Konfirmasi PIN harus terdiri dari 6 digit."
            );

            return;
        }

        if (pin !== confirmation) {
            showError("Konfirmasi PIN tidak sama.");
            return;
        }

        await storePin(pin);
        unlockApplication();

        window.dispatchEvent(
            new CustomEvent("sajuHabitPinCreated")
        );
    }

    async function verifyUnlockPin(pin) {
        const correct = await isPinCorrect(pin);

        if (!correct) {
            elements.pinInput.value = "";
            showError("PIN salah. Silakan coba kembali.");
            elements.pinInput.focus();
            return;
        }

        unlockApplication();
    }

    async function verifyCurrentPin(pin) {
        const correct = await isPinCorrect(pin);

        if (!correct) {
            elements.pinInput.value = "";
            showError("PIN lama salah.");
            elements.pinInput.focus();
            return;
        }

        configureNewPinMode();
    }

    async function saveNewPin(pin, confirmation) {
        if (!isValidPin(confirmation)) {
            showError(
                "Konfirmasi PIN baru harus 6 digit."
            );

            return;
        }

        if (pin !== confirmation) {
            showError("Konfirmasi PIN baru tidak sama.");
            return;
        }

        await storePin(pin);
        unlockApplication();

        window.dispatchEvent(
            new CustomEvent("sajuHabitPinChanged")
        );
    }

    function configureSetupMode() {
        currentMode = "setup";

        elements.title.textContent = "Buat PIN";
        elements.description.textContent =
            "Buat PIN 6 digit untuk melindungi data Saju Habit di perangkat ini.";

        elements.pinInput.placeholder = "PIN baru";
        elements.confirmPinInput.placeholder =
            "Ulangi PIN";

        elements.submitButton.textContent = "Buat PIN";

        setConfirmationVisible(true);
        resetInputs();
    }

    function configureUnlockMode() {
        currentMode = "unlock";

        elements.title.textContent = "Saju Habit";
        elements.description.textContent =
            "Masukkan PIN 6 digit untuk membuka aplikasi.";

        elements.pinInput.placeholder = "••••••";
        elements.submitButton.textContent =
            "Buka Aplikasi";

        setConfirmationVisible(false);
        resetInputs();
    }

    function configureCurrentPinMode() {
        currentMode = "change-verify";

        elements.title.textContent = "Ganti PIN";
        elements.description.textContent =
            "Masukkan PIN lama untuk melanjutkan.";

        elements.pinInput.placeholder = "PIN lama";
        elements.submitButton.textContent =
            "Verifikasi PIN";

        setConfirmationVisible(false);
        resetInputs();
    }

    function configureNewPinMode() {
        currentMode = "change-new";

        elements.title.textContent = "Buat PIN Baru";
        elements.description.textContent =
            "Masukkan dan konfirmasi PIN baru 6 digit.";

        elements.pinInput.placeholder = "PIN baru";
        elements.confirmPinInput.placeholder =
            "Ulangi PIN baru";

        elements.submitButton.textContent =
            "Simpan PIN Baru";

        setConfirmationVisible(true);
        resetInputs();

        window.setTimeout(() => {
            elements.pinInput.focus();
        }, 80);
    }

    function setConfirmationVisible(visible) {
        elements.confirmPinInput.classList.toggle(
            "is-hidden",
            !visible
        );

        elements.confirmPinInput.required = visible;

        if (elements.confirmPinLabel) {
            elements.confirmPinLabel.classList.toggle(
                "is-hidden",
                !visible
            );
        }
    }

    function resetInputs() {
        elements.pinInput.value = "";
        elements.confirmPinInput.value = "";
        clearMessage();
    }

    function unlockApplication() {
        resetInputs();

        elements.screen.classList.add("is-hidden");
        elements.app.classList.remove("is-hidden");

        currentMode = "unlock";

        window.dispatchEvent(
            new CustomEvent("sajuHabitUnlocked")
        );
    }

    function lockApplication() {
        configureUnlockMode();

        elements.app.classList.add("is-hidden");
        elements.screen.classList.remove("is-hidden");

        window.scrollTo({
            top: 0,
            behavior: "auto"
        });

        window.setTimeout(() => {
            elements.pinInput.focus();
        }, 100);
    }

    function beginPinChange() {
        configureCurrentPinMode();

        elements.app.classList.add("is-hidden");
        elements.screen.classList.remove("is-hidden");

        window.setTimeout(() => {
            elements.pinInput.focus();
        }, 100);
    }

    function hasSavedPin() {
        const record = readPinRecord();

        return Boolean(
            record &&
            record.version === 1 &&
            typeof record.salt === "string" &&
            typeof record.hash === "string"
        );
    }

    function readPinRecord() {
        const savedRecord =
            localStorage.getItem(PIN_STORAGE_KEY);

        if (!savedRecord) {
            return null;
        }

        try {
            return JSON.parse(savedRecord);
        } catch (error) {
            console.error(
                "Data PIN tidak valid:",
                error
            );

            return null;
        }
    }

    async function storePin(pin) {
        const salt = createSalt();
        const hash = await hashPin(pin, salt);
        const previousRecord = readPinRecord();
        const now = new Date().toISOString();

        const record = {
            version: 1,
            salt,
            hash,
            createdAt:
                previousRecord?.createdAt || now,
            updatedAt: now
        };

        localStorage.setItem(
            PIN_STORAGE_KEY,
            JSON.stringify(record)
        );
    }

    async function isPinCorrect(pin) {
        const record = readPinRecord();

        if (!record) {
            return false;
        }

        const enteredHash = await hashPin(
            pin,
            record.salt
        );

        return secureTextCompare(
            enteredHash,
            record.hash
        );
    }

    function createSalt() {
        const randomBytes = new Uint8Array(16);
        window.crypto.getRandomValues(randomBytes);

        return bytesToBase64(randomBytes);
    }

    async function hashPin(pin, salt) {
        if (
            !window.crypto ||
            !window.crypto.subtle
        ) {
            throw new Error(
                "Web Crypto tidak tersedia."
            );
        }

        const encodedData = new TextEncoder().encode(
            `${salt}:${pin}`
        );

        const digest = await window.crypto.subtle.digest(
            "SHA-256",
            encodedData
        );

        return bytesToBase64(
            new Uint8Array(digest)
        );
    }

    function bytesToBase64(bytes) {
        let binary = "";

        bytes.forEach((byte) => {
            binary += String.fromCharCode(byte);
        });

        return window.btoa(binary);
    }

    function secureTextCompare(first, second) {
        if (
            typeof first !== "string" ||
            typeof second !== "string" ||
            first.length !== second.length
        ) {
            return false;
        }

        let difference = 0;

        for (
            let index = 0;
            index < first.length;
            index += 1
        ) {
            difference |=
                first.charCodeAt(index) ^
                second.charCodeAt(index);
        }

        return difference === 0;
    }

    function isValidPin(pin) {
        return new RegExp(
            `^\\d{${PIN_LENGTH}}$`
        ).test(pin);
    }

    function showError(message) {
        elements.message.textContent = message;
        elements.message.classList.add("is-visible");
    }

    function clearMessage() {
        elements.message.textContent = "";
        elements.message.classList.remove("is-visible");
    }

    return {
        lock: lockApplication,
        changePin: beginPinChange,
        hasPin: hasSavedPin,
        getPinStorageKey: () => PIN_STORAGE_KEY
    };
})();