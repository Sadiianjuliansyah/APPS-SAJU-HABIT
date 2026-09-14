"use strict";

window.SajuHabitStorage = (() => {
    const STORAGE_KEY = "saju_habit_private_data_v1";
    const DATA_VERSION = 1;

    const starterHabits = [
        {
            id: "habit-water",
            name: "Minum air 8 gelas",
            category: "Kesehatan",
            color: "#1687ff",
            active: true,
            order: 0
        },
        {
            id: "habit-exercise",
            name: "Olahraga 30 menit",
            category: "Olahraga",
            color: "#28d17c",
            active: true,
            order: 1
        },
        {
            id: "habit-learning",
            name: "Belajar 1 jam",
            category: "Belajar",
            color: "#a970ff",
            active: true,
            order: 2
        },
        {
            id: "habit-sleep",
            name: "Tidur sebelum pukul 23.00",
            category: "Kesehatan",
            color: "#ffb020",
            active: true,
            order: 3
        }
    ];

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function createId() {
        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return `habit-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`;
    }

    function createDefaultData() {
        const now = new Date().toISOString();

        return {
            version: DATA_VERSION,
            habits: starterHabits.map((habit) => ({
                ...habit,
                createdAt: now,
                updatedAt: now
            })),
            checklists: {},
            settings: {
                theme: "dark"
            },
            metadata: {
                createdAt: now,
                updatedAt: now
            }
        };
    }

    function normalizeHabit(habit, index) {
        const now = new Date().toISOString();

        return {
            id:
                typeof habit.id === "string" && habit.id
                    ? habit.id
                    : createId(),

            name:
                typeof habit.name === "string" && habit.name.trim()
                    ? habit.name.trim().slice(0, 50)
                    : `Habit ${index + 1}`,

            category:
                typeof habit.category === "string" && habit.category.trim()
                    ? habit.category.trim().slice(0, 30)
                    : "Lainnya",

            color:
                typeof habit.color === "string" &&
                /^#[0-9a-f]{6}$/i.test(habit.color)
                    ? habit.color
                    : "#1687ff",

            active: habit.active !== false,

            order:
                Number.isFinite(Number(habit.order))
                    ? Number(habit.order)
                    : index,

            createdAt:
                typeof habit.createdAt === "string"
                    ? habit.createdAt
                    : now,

            updatedAt:
                typeof habit.updatedAt === "string"
                    ? habit.updatedAt
                    : now
        };
    }

    function normalizeChecklists(checklists, validHabitIds) {
        const normalized = {};

        if (
            !checklists ||
            typeof checklists !== "object" ||
            Array.isArray(checklists)
        ) {
            return normalized;
        }

        Object.entries(checklists).forEach(([date, dailyData]) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return;
            }

            if (
                !dailyData ||
                typeof dailyData !== "object" ||
                Array.isArray(dailyData)
            ) {
                return;
            }

            const normalizedDay = {};

            Object.entries(dailyData).forEach(([habitId, completed]) => {
                if (
                    validHabitIds.has(habitId) &&
                    completed === true
                ) {
                    normalizedDay[habitId] = true;
                }
            });

            if (Object.keys(normalizedDay).length > 0) {
                normalized[date] = normalizedDay;
            }
        });

        return normalized;
    }

    function normalizeData(rawData) {
        const fallback = createDefaultData();

        if (
            !rawData ||
            typeof rawData !== "object" ||
            Array.isArray(rawData)
        ) {
            return fallback;
        }

        const rawHabits = Array.isArray(rawData.habits)
            ? rawData.habits
            : [];

        const habits = rawHabits
            .map(normalizeHabit)
            .sort((first, second) => first.order - second.order)
            .map((habit, index) => ({
                ...habit,
                order: index
            }));

        const validHabitIds = new Set(
            habits.map((habit) => habit.id)
        );

        const checklists = normalizeChecklists(
            rawData.checklists,
            validHabitIds
        );

        const createdAt =
            rawData.metadata &&
            typeof rawData.metadata.createdAt === "string"
                ? rawData.metadata.createdAt
                : new Date().toISOString();

        return {
            version: DATA_VERSION,
            habits,
            checklists,
            settings: {
                theme:
                    rawData.settings &&
                    rawData.settings.theme === "light"
                        ? "light"
                        : "dark"
            },
            metadata: {
                createdAt,
                updatedAt: new Date().toISOString()
            }
        };
    }

    function saveData(data) {
        const normalized = normalizeData(data);

        normalized.metadata.updatedAt = new Date().toISOString();

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(normalized)
        );

        return deepClone(normalized);
    }

    function loadData() {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return saveData(createDefaultData());
        }

        try {
            return normalizeData(JSON.parse(savedData));
        } catch (error) {
            console.error("Data Saju Habit gagal dibaca:", error);
            return saveData(createDefaultData());
        }
    }

    function getData() {
        return deepClone(loadData());
    }

    function addHabit({ name, category, color }) {
        const data = loadData();
        const now = new Date().toISOString();

        const newHabit = normalizeHabit(
            {
                id: createId(),
                name,
                category,
                color,
                active: true,
                order: data.habits.length,
                createdAt: now,
                updatedAt: now
            },
            data.habits.length
        );

        data.habits.push(newHabit);
        saveData(data);

        return deepClone(newHabit);
    }

    function updateHabit(habitId, updates) {
        const data = loadData();
        const habitIndex = data.habits.findIndex(
            (habit) => habit.id === habitId
        );

        if (habitIndex === -1) {
            return false;
        }

        const currentHabit = data.habits[habitIndex];

        data.habits[habitIndex] = normalizeHabit(
            {
                ...currentHabit,
                ...updates,
                id: currentHabit.id,
                order: currentHabit.order,
                createdAt: currentHabit.createdAt,
                updatedAt: new Date().toISOString()
            },
            habitIndex
        );

        saveData(data);
        return true;
    }

    function toggleHabitActive(habitId) {
        const data = loadData();
        const habit = data.habits.find(
            (item) => item.id === habitId
        );

        if (!habit) {
            return false;
        }

        habit.active = !habit.active;
        habit.updatedAt = new Date().toISOString();

        saveData(data);
        return habit.active;
    }

    function removeHabit(habitId) {
        const data = loadData();
        const habitExists = data.habits.some(
            (habit) => habit.id === habitId
        );

        if (!habitExists) {
            return false;
        }

        data.habits = data.habits
            .filter((habit) => habit.id !== habitId)
            .map((habit, index) => ({
                ...habit,
                order: index
            }));

        Object.keys(data.checklists).forEach((date) => {
            delete data.checklists[date][habitId];

            if (
                Object.keys(data.checklists[date]).length === 0
            ) {
                delete data.checklists[date];
            }
        });

        saveData(data);
        return true;
    }

    function moveHabit(habitId, direction) {
        const data = loadData();

        const currentIndex = data.habits.findIndex(
            (habit) => habit.id === habitId
        );

        if (currentIndex === -1) {
            return false;
        }

        const targetIndex =
            direction === "up"
                ? currentIndex - 1
                : currentIndex + 1;

        if (
            targetIndex < 0 ||
            targetIndex >= data.habits.length
        ) {
            return false;
        }

        const [movedHabit] = data.habits.splice(currentIndex, 1);
        data.habits.splice(targetIndex, 0, movedHabit);

        data.habits = data.habits.map((habit, index) => ({
            ...habit,
            order: index,
            updatedAt:
                habit.id === habitId
                    ? new Date().toISOString()
                    : habit.updatedAt
        }));

        saveData(data);
        return true;
    }

    function setChecklist(date, habitId, completed) {
        const data = loadData();

        const habitExists = data.habits.some(
            (habit) => habit.id === habitId
        );

        if (
            !habitExists ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date)
        ) {
            return false;
        }

        if (!data.checklists[date]) {
            data.checklists[date] = {};
        }

        if (completed) {
            data.checklists[date][habitId] = true;
        } else {
            delete data.checklists[date][habitId];
        }

        if (
            Object.keys(data.checklists[date]).length === 0
        ) {
            delete data.checklists[date];
        }

        saveData(data);
        return true;
    }

    function isHabitCompleted(date, habitId) {
        const data = loadData();

        return Boolean(
            data.checklists[date] &&
            data.checklists[date][habitId] === true
        );
    }

    function getChecklistForDate(date) {
        const data = loadData();

        return deepClone(data.checklists[date] || {});
    }

    function setTheme(theme) {
        const data = loadData();

        data.settings.theme =
            theme === "light" ? "light" : "dark";

        saveData(data);
        return data.settings.theme;
    }

    function createExportPayload() {
        return {
            application: "Saju Habit",
            format: "saju-habit-backup",
            version: DATA_VERSION,
            exportedAt: new Date().toISOString(),
            data: getData()
        };
    }

    function importData(payload) {
        if (
            !payload ||
            typeof payload !== "object" ||
            Array.isArray(payload)
        ) {
            throw new Error("Format file tidak valid.");
        }

        const importedData =
            payload.format === "daily-habit-backup"
                ? payload.data
                : payload;

        if (
            !importedData ||
            !Array.isArray(importedData.habits) ||
            !importedData.checklists ||
            typeof importedData.checklists !== "object"
        ) {
            throw new Error(
                "File bukan cadangan data Saju Habit."
            );
        }

        return saveData(importedData);
    }

    function resetData() {
    const now = new Date().toISOString();

    const emptyData = {
        version: DATA_VERSION,
        habits: [],
        checklists: {},
        settings: {
            theme: "dark"
        },
        metadata: {
            createdAt: now,
            updatedAt: now
        }
    };

    localStorage.removeItem(STORAGE_KEY);

    return saveData(emptyData);
}
    return {
        getData,
        addHabit,
        updateHabit,
        toggleHabitActive,
        removeHabit,
        moveHabit,
        setChecklist,
        isHabitCompleted,
        getChecklistForDate,
        setTheme,
        createExportPayload,
        importData,
        resetData,
        getStorageKey: () => STORAGE_KEY
    };
})();