"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const Storage = window.SajuHabitStorage;

    const elements = {
        navButtons: document.querySelectorAll("[data-page]"),
        pages: document.querySelectorAll(".page"),
        pageTitle: document.getElementById("pageTitle"),
        currentDateText: document.getElementById("currentDateText"),

        themeButton: document.getElementById("themeButton"),
        lockButton: document.getElementById("lockButton"),

        selectedDate: document.getElementById("selectedDate"),
        historyMonth: document.getElementById("historyMonth"),

        welcomeTitle: document.getElementById("welcomeTitle"),
        motivationText: document.getElementById("motivationText"),
        checklistTitle: document.getElementById("checklistTitle"),

        totalHabitStat: document.getElementById("totalHabitStat"),
        completedHabitStat: document.getElementById("completedHabitStat"),
        completedHabitLabel: document.getElementById("completedHabitLabel"),
        progressStat: document.getElementById("progressStat"),
        bestStreakStat: document.getElementById("bestStreakStat"),

        dailyHabitList: document.getElementById("dailyHabitList"),
        emptyHabitState: document.getElementById("emptyHabitState"),
        habitManagementList: document.getElementById("habitManagementList"),

        weeklyChart: document.getElementById("weeklyChart"),
        progressRing: document.getElementById("progressRing"),
        progressRingValue: document.getElementById("progressRingValue"),
        progressMessage: document.getElementById("progressMessage"),
        progressDetail: document.getElementById("progressDetail"),

        monthlyAverage: document.getElementById("monthlyAverage"),
        monthlyCompleted: document.getElementById("monthlyCompleted"),
        perfectDays: document.getElementById("perfectDays"),
        historyTableHead: document.getElementById("historyTableHead"),
        historyTableBody: document.getElementById("historyTableBody"),

        habitModal: document.getElementById("habitModal"),
        habitModalTitle: document.getElementById("habitModalTitle"),
        habitForm: document.getElementById("habitForm"),
        habitId: document.getElementById("habitId"),
        habitName: document.getElementById("habitName"),
        habitCategory: document.getElementById("habitCategory"),
        habitColor: document.getElementById("habitColor"),

        confirmModal: document.getElementById("confirmModal"),
        confirmTitle: document.getElementById("confirmTitle"),
        confirmMessage: document.getElementById("confirmMessage"),
        confirmActionButton: document.getElementById("confirmActionButton"),

        exportButton: document.getElementById("exportButton"),
        importInput: document.getElementById("importInput"),
        changePinButton: document.getElementById("changePinButton"),
        deleteDataButton: document.getElementById("deleteDataButton"),

        toast: document.getElementById("toast")
    };

    const state = {
        selectedDate: formatDateKey(new Date()),
        historyMonth: formatDateKey(new Date()).slice(0, 7),
        currentPage: "dashboard",
        editingHabitId: null,
        pendingConfirmAction: null,
        toastTimer: null,
        resizeTimer: null
    };

    const pageTitles = {
        dashboard: "Dashboard",
        habits: "Kelola Habit",
        history: "Riwayat",
        settings: "Pengaturan"
    };

    initialize();

    function initialize() {
        if (!Storage) {
            alert("Sistem penyimpanan Saju Habit gagal dimuat.");
            return;
        }

        const today = formatDateKey(new Date());

        elements.selectedDate.value = state.selectedDate;
        elements.selectedDate.max = today;

        elements.historyMonth.value = state.historyMonth;
        elements.historyMonth.max = today.slice(0, 7);

        elements.currentDateText.textContent =
            formatFullDate(new Date()).toUpperCase();

        applySavedTheme();
        bindEvents();
        updateWelcomeText();
        renderAll();
    }

    function bindEvents() {
        elements.navButtons.forEach((button) => {
            button.addEventListener("click", () => {
                navigateTo(button.dataset.page);
            });
        });

        elements.selectedDate.addEventListener("change", () => {
            if (!elements.selectedDate.value) {
                return;
            }

            state.selectedDate = elements.selectedDate.value;
            renderDashboard();
        });

        elements.historyMonth.addEventListener("change", () => {
            if (!elements.historyMonth.value) {
                return;
            }

            state.historyMonth = elements.historyMonth.value;
            renderHistory();
        });

        elements.themeButton.addEventListener("click", toggleTheme);
        elements.lockButton.addEventListener("click", () => {
    if (window.SajuHabitSecurity) {
        window.SajuHabitSecurity.lock();
    }
});

elements.changePinButton.addEventListener("click", () => {
    if (window.SajuHabitSecurity) {
        window.SajuHabitSecurity.changePin();
    }
});

        document
            .querySelectorAll("[data-open-habit-modal]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    openHabitModal();
                });
            });

        document
            .querySelectorAll("[data-close-modal]")
            .forEach((button) => {
                button.addEventListener("click", closeHabitModal);
            });

        document
            .querySelectorAll("[data-close-confirm]")
            .forEach((button) => {
                button.addEventListener("click", closeConfirmModal);
            });

        elements.habitForm.addEventListener(
            "submit",
            handleHabitFormSubmit
        );

        elements.confirmActionButton.addEventListener("click", () => {
            const action = state.pendingConfirmAction;
            closeConfirmModal();

            if (typeof action === "function") {
                action();
            }
        });

        elements.exportButton.addEventListener(
            "click",
            exportApplicationData
        );

        elements.importInput.addEventListener(
            "change",
            handleImportFile
        );

        elements.deleteDataButton.addEventListener(
            "click",
            confirmDeleteAllData
        );

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") {
                return;
            }

            closeHabitModal();
            closeConfirmModal();
        });

        window.addEventListener("resize", () => {
            window.clearTimeout(state.resizeTimer);

            state.resizeTimer = window.setTimeout(() => {
                if (state.currentPage === "dashboard") {
                    renderWeeklyChart();
                }
            }, 150);
        });
    }

    function navigateTo(pageName) {
        if (!pageTitles[pageName]) {
            return;
        }

        state.currentPage = pageName;

        elements.pages.forEach((page) => {
            page.classList.toggle(
                "is-active",
                page.id === `${pageName}Page`
            );
        });

        elements.navButtons.forEach((button) => {
            button.classList.toggle(
                "is-active",
                button.dataset.page === pageName
            );
        });

        elements.pageTitle.textContent = pageTitles[pageName];

        if (pageName === "dashboard") {
            renderDashboard();
        }

        if (pageName === "habits") {
            renderHabitManagement();
        }

        if (pageName === "history") {
            renderHistory();
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function renderAll() {
        renderDashboard();
        renderHabitManagement();
        renderHistory();
    }

    function renderDashboard() {
        const data = Storage.getData();

        const activeHabits = data.habits
            .filter((habit) => habit.active)
            .sort((first, second) => first.order - second.order);

        const dailyChecklist =
            data.checklists[state.selectedDate] || {};

        const completedCount = activeHabits.filter(
            (habit) => dailyChecklist[habit.id] === true
        ).length;

        const progress = activeHabits.length
            ? Math.round(
                (completedCount / activeHabits.length) * 100
            )
            : 0;

        elements.totalHabitStat.textContent =
            activeHabits.length.toString();

        elements.completedHabitStat.textContent =
            completedCount.toString();

        elements.completedHabitLabel.textContent =
            formatShortDate(dateFromKey(state.selectedDate));

        elements.progressStat.textContent = `${progress}%`;

        elements.bestStreakStat.textContent =
            calculateBestStreak(data, activeHabits).toString();

        elements.checklistTitle.textContent =
            isToday(state.selectedDate)
                ? "Habit hari ini"
                : `Habit ${formatShortDate(
                    dateFromKey(state.selectedDate)
                )}`;

        renderDailyHabitList(activeHabits, dailyChecklist);
        renderProgressSummary(progress, completedCount, activeHabits.length);
        renderWeeklyChart();
    }

    function renderDailyHabitList(habits, dailyChecklist) {
        elements.dailyHabitList.replaceChildren();

        const hasHabits = habits.length > 0;

        elements.emptyHabitState.classList.toggle(
            "is-hidden",
            hasHabits
        );

        elements.dailyHabitList.classList.toggle(
            "is-hidden",
            !hasHabits
        );

        habits.forEach((habit) => {
            const completed =
                dailyChecklist[habit.id] === true;

            const item = document.createElement("article");
            item.className = "habit-check-item";
            item.style.setProperty(
                "--habit-color",
                habit.color
            );

            if (completed) {
                item.classList.add("is-completed");
            }

            const checkbox = document.createElement("button");
            checkbox.type = "button";
            checkbox.className = "habit-checkbox";
            checkbox.setAttribute(
                "aria-label",
                completed
                    ? `Batalkan ${habit.name}`
                    : `Selesaikan ${habit.name}`
            );

            if (completed) {
                checkbox.classList.add("is-checked");
            }

            checkbox.addEventListener("click", () => {
                Storage.setChecklist(
                    state.selectedDate,
                    habit.id,
                    !completed
                );

                renderDashboard();
                renderHistory();

                showToast(
                    !completed
                        ? `"${habit.name}" berhasil diselesaikan.`
                        : `Checklist "${habit.name}" dibatalkan.`
                );
            });

            const information = document.createElement("div");
            information.className = "habit-info";

            const name = document.createElement("span");
            name.className = "habit-name";
            name.textContent = habit.name;

            const category = document.createElement("span");
            category.className = "habit-category";
            category.textContent = habit.category;

            information.append(name, category);

            const colorDot = document.createElement("span");
            colorDot.className = "habit-color-dot";
            colorDot.setAttribute("aria-hidden", "true");

            item.append(
                checkbox,
                information,
                colorDot
            );

            elements.dailyHabitList.appendChild(item);
        });
    }

    function renderProgressSummary(
        progress,
        completedCount,
        totalHabits
    ) {
        elements.progressRing.style.setProperty(
            "--progress",
            `${progress * 3.6}deg`
        );

        elements.progressRingValue.textContent = `${progress}%`;

        let title = "Ayo mulai!";
        let detail = "Mulai dari satu habit kecil hari ini.";

        if (totalHabits === 0) {
            title = "Tambahkan habit";
            detail = "Buat rutinitas pertama yang ingin kamu bangun.";
        } else if (progress === 100) {
            title = "Hari yang sempurna!";
            detail = "Semua habit berhasil kamu selesaikan.";
        } else if (progress >= 75) {
            title = "Sedikit lagi!";
            detail = `${completedCount} dari ${totalHabits} habit selesai.`;
        } else if (progress >= 50) {
            title = "Progres yang bagus";
            detail = `${completedCount} dari ${totalHabits} habit selesai.`;
        } else if (progress > 0) {
            title = "Awal yang baik";
            detail = `${completedCount} dari ${totalHabits} habit selesai.`;
        }

        elements.progressMessage.textContent = title;
        elements.progressDetail.textContent = detail;

        const motivationMessages = [
            "Konsistensi lebih penting daripada kesempurnaan.",
            "Progres kecil setiap hari tetap membawa perubahan besar.",
            "Kebiasaan yang kuat dibangun dari keputusan sederhana.",
            "Selesaikan satu langkah, lalu lanjutkan langkah berikutnya.",
            "Disiplin hari ini adalah hasil yang kamu nikmati nanti."
        ];

        const dateNumber = dateFromKey(
            state.selectedDate
        ).getDate();

        elements.motivationText.textContent =
            progress === 100
                ? "Kamu menepati seluruh komitmen hari ini. Pertahankan ritmenya."
                : motivationMessages[
                    dateNumber % motivationMessages.length
                ];
    }

    function updateWelcomeText() {
        const currentHour = new Date().getHours();

        if (currentHour < 11) {
            elements.welcomeTitle.textContent =
                "Mulai pagi dengan progres.";
        } else if (currentHour < 15) {
            elements.welcomeTitle.textContent =
                "Jaga momentum hari ini.";
        } else if (currentHour < 19) {
            elements.welcomeTitle.textContent =
                "Masih ada waktu untuk progres.";
        } else {
            elements.welcomeTitle.textContent =
                "Tutup hari dengan konsisten.";
        }
    }

    function renderHabitManagement() {
        const data = Storage.getData();

        const habits = [...data.habits].sort(
            (first, second) => first.order - second.order
        );

        elements.habitManagementList.replaceChildren();

        if (habits.length === 0) {
            const empty = document.createElement("div");
            empty.className = "management-empty";

            const title = document.createElement("h4");
            title.textContent = "Belum ada habit";

            const description = document.createElement("p");
            description.textContent =
                "Tambahkan habit untuk mulai mencatat progres.";

            const button = document.createElement("button");
            button.type = "button";
            button.className = "button button-primary";
            button.textContent = "+ Tambah Habit";
            button.addEventListener("click", () => {
                openHabitModal();
            });

            empty.append(title, description, button);
            elements.habitManagementList.appendChild(empty);
            return;
        }

        habits.forEach((habit, index) => {
            const item = document.createElement("article");
            item.className = "management-item";
            item.style.setProperty(
                "--habit-color",
                habit.color
            );

            if (!habit.active) {
                item.classList.add("is-inactive");
            }

            const color = document.createElement("span");
            color.className = "management-color";

            const information = document.createElement("div");
            information.className = "management-info";

            const name = document.createElement("strong");
            name.textContent = habit.name;

            const category = document.createElement("span");
            category.textContent = habit.category;

            information.append(name, category);

            const status = document.createElement("span");
            status.className = "status-badge";
            status.textContent = habit.active
                ? "Aktif"
                : "Nonaktif";

            if (!habit.active) {
                status.classList.add("is-inactive");
            }

            const actions = document.createElement("div");
            actions.className = "item-actions";

            const upButton = createActionButton(
                "↑",
                "Geser ke atas",
                () => {
                    Storage.moveHabit(habit.id, "up");
                    renderAll();
                }
            );

            upButton.disabled = index === 0;

            const downButton = createActionButton(
                "↓",
                "Geser ke bawah",
                () => {
                    Storage.moveHabit(habit.id, "down");
                    renderAll();
                }
            );

            downButton.disabled = index === habits.length - 1;

            const editButton = createActionButton(
                "✎",
                "Edit habit",
                () => {
                    openHabitModal(habit.id);
                }
            );

            const activeButton = createActionButton(
                habit.active ? "◉" : "○",
                habit.active
                    ? "Nonaktifkan habit"
                    : "Aktifkan habit",
                () => {
                    Storage.toggleHabitActive(habit.id);
                    renderAll();

                    showToast(
                        habit.active
                            ? `"${habit.name}" dinonaktifkan.`
                            : `"${habit.name}" diaktifkan.`
                    );
                }
            );

            const deleteButton = createActionButton(
                "×",
                "Hapus habit",
                () => {
                    confirmDeleteHabit(habit);
                },
                true
            );

            actions.append(
                upButton,
                downButton,
                editButton,
                activeButton,
                deleteButton
            );

            item.append(
                color,
                information,
                status,
                actions
            );

            elements.habitManagementList.appendChild(item);
        });
    }

    function createActionButton(
        text,
        title,
        clickHandler,
        danger = false
    ) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "action-button";
        button.textContent = text;
        button.title = title;
        button.setAttribute("aria-label", title);

        if (danger) {
            button.classList.add("is-danger");
        }

        button.addEventListener("click", clickHandler);

        return button;
    }

    function openHabitModal(habitId = null) {
        state.editingHabitId = habitId;

        if (habitId) {
            const data = Storage.getData();
            const habit = data.habits.find(
                (item) => item.id === habitId
            );

            if (!habit) {
                return;
            }

            elements.habitModalTitle.textContent =
                "Edit Habit";

            elements.habitId.value = habit.id;
            elements.habitName.value = habit.name;
            elements.habitCategory.value =
                habit.category;

            if (
                !Array.from(elements.habitCategory.options)
                    .some((option) => option.value === habit.category)
            ) {
                elements.habitCategory.value = "Lainnya";
            }

            elements.habitColor.value = habit.color;
        } else {
            elements.habitModalTitle.textContent =
                "Tambah Habit";

            elements.habitForm.reset();
            elements.habitId.value = "";
            elements.habitColor.value = "#1687ff";
        }

        elements.habitModal.classList.add("is-open");
        elements.habitModal.setAttribute(
            "aria-hidden",
            "false"
        );

        window.setTimeout(() => {
            elements.habitName.focus();
        }, 100);
    }

    function closeHabitModal() {
        elements.habitModal.classList.remove("is-open");
        elements.habitModal.setAttribute(
            "aria-hidden",
            "true"
        );

        state.editingHabitId = null;
    }

    function handleHabitFormSubmit(event) {
        event.preventDefault();

        const name = elements.habitName.value.trim();
        const category = elements.habitCategory.value;
        const color = elements.habitColor.value;

        if (!name) {
            showToast(
                "Nama habit tidak boleh kosong.",
                true
            );
            return;
        }

        const data = Storage.getData();

        const duplicateHabit = data.habits.some(
            (habit) =>
                habit.id !== state.editingHabitId &&
                habit.name.toLowerCase() === name.toLowerCase()
        );

        if (duplicateHabit) {
            showToast(
                "Nama habit tersebut sudah digunakan.",
                true
            );
            return;
        }

        if (state.editingHabitId) {
            Storage.updateHabit(
                state.editingHabitId,
                {
                    name,
                    category,
                    color
                }
            );

            showToast("Habit berhasil diperbarui.");
        } else {
            Storage.addHabit({
                name,
                category,
                color
            });

            showToast("Habit baru berhasil ditambahkan.");
        }

        closeHabitModal();
        renderAll();
    }

    function confirmDeleteHabit(habit) {
        openConfirmModal({
            title: "Hapus Habit",
            message:
                `Habit "${habit.name}" dan seluruh riwayat checklist-nya akan dihapus permanen.`,
            actionText: "Hapus",
            action: () => {
                Storage.removeHabit(habit.id);
                renderAll();
                showToast(`"${habit.name}" berhasil dihapus.`);
            }
        });
    }

    function openConfirmModal({
        title,
        message,
        actionText,
        action
    }) {
        elements.confirmTitle.textContent = title;
        elements.confirmMessage.textContent = message;
        elements.confirmActionButton.textContent = actionText;
        state.pendingConfirmAction = action;

        elements.confirmModal.classList.add("is-open");
        elements.confirmModal.setAttribute(
            "aria-hidden",
            "false"
        );
    }

    function closeConfirmModal() {
        elements.confirmModal.classList.remove("is-open");
        elements.confirmModal.setAttribute(
            "aria-hidden",
            "true"
        );

        state.pendingConfirmAction = null;
    }

    function renderHistory() {
        const data = Storage.getData();
        const habits = [...data.habits].sort(
            (first, second) => first.order - second.order
        );

        const [year, month] = state.historyMonth
            .split("-")
            .map(Number);

        const daysInMonth = new Date(
            year,
            month,
            0
        ).getDate();

        const todayKey = formatDateKey(new Date());

        elements.historyTableHead.replaceChildren();
        elements.historyTableBody.replaceChildren();

        const headerRow = document.createElement("tr");
        const habitHeader = document.createElement("th");

        habitHeader.textContent = "Habit";
        headerRow.appendChild(habitHeader);

        for (let day = 1; day <= daysInMonth; day += 1) {
            const dayHeader = document.createElement("th");
            dayHeader.textContent = day.toString();
            headerRow.appendChild(dayHeader);
        }

        elements.historyTableHead.appendChild(headerRow);

        if (habits.length === 0) {
            const emptyRow = document.createElement("tr");
            const emptyCell = document.createElement("td");

            emptyCell.colSpan = daysInMonth + 1;
            emptyCell.textContent =
                "Belum ada habit untuk ditampilkan.";
            emptyCell.style.textAlign = "center";
            emptyCell.style.padding = "35px";

            emptyRow.appendChild(emptyCell);
            elements.historyTableBody.appendChild(emptyRow);

            updateMonthlyStatistics(
                data,
                habits,
                year,
                month,
                daysInMonth
            );

            return;
        }

        habits.forEach((habit) => {
            const row = document.createElement("tr");
            const nameCell = document.createElement("td");

            const nameWrapper = document.createElement("div");
            nameWrapper.className = "history-habit-name";
            nameWrapper.style.setProperty(
                "--habit-color",
                habit.color
            );

            const dot = document.createElement("span");
            dot.className = "history-dot";

            const name = document.createElement("span");
            name.textContent = habit.name;

            nameWrapper.append(dot, name);
            nameCell.appendChild(nameWrapper);
            row.appendChild(nameCell);

            for (let day = 1; day <= daysInMonth; day += 1) {
                const dateKey = createMonthDateKey(
                    year,
                    month,
                    day
                );

                const cell = document.createElement("td");
                const indicator = document.createElement("span");

                indicator.className = "history-check";

                if (dateKey > todayKey) {
                    indicator.classList.add("is-future");
                    indicator.textContent = "·";
                } else if (
                    data.checklists[dateKey]?.[habit.id] === true
                ) {
                    indicator.classList.add("is-completed");
                    indicator.textContent = "✓";
                } else {
                    indicator.textContent = "—";
                }

                cell.appendChild(indicator);
                row.appendChild(cell);
            }

            elements.historyTableBody.appendChild(row);
        });

        updateMonthlyStatistics(
            data,
            habits,
            year,
            month,
            daysInMonth
        );
    }

    function updateMonthlyStatistics(
        data,
        habits,
        year,
        month,
        daysInMonth
    ) {
        const today = new Date();
        const selectedMonthValue = `${year}-${String(month).padStart(2, "0")}`;
        const currentMonthValue = formatDateKey(today).slice(0, 7);

        const countedDays =
            selectedMonthValue === currentMonthValue
                ? today.getDate()
                : daysInMonth;

        let completedTotal = 0;
        let perfectDayTotal = 0;

        for (let day = 1; day <= countedDays; day += 1) {
            const dateKey = createMonthDateKey(
                year,
                month,
                day
            );

            const completedOnDay = habits.filter(
                (habit) =>
                    data.checklists[dateKey]?.[habit.id] === true
            ).length;

            completedTotal += completedOnDay;

            if (
                habits.length > 0 &&
                completedOnDay === habits.length
            ) {
                perfectDayTotal += 1;
            }
        }

        const totalOpportunities =
            habits.length * countedDays;

        const average = totalOpportunities
            ? Math.round(
                (completedTotal / totalOpportunities) * 100
            )
            : 0;

        elements.monthlyAverage.textContent =
            `${average}%`;

        elements.monthlyCompleted.textContent =
            completedTotal.toString();

        elements.perfectDays.textContent =
            perfectDayTotal.toString();
    }

    function calculateBestStreak(data, activeHabits) {
        if (activeHabits.length === 0) {
            return 0;
        }

        const perfectDates = Object.keys(data.checklists)
            .filter((dateKey) =>
                activeHabits.every(
                    (habit) =>
                        data.checklists[dateKey]?.[habit.id] === true
                )
            )
            .sort();

        if (perfectDates.length === 0) {
            return 0;
        }

        let bestStreak = 1;
        let currentStreak = 1;

        for (
            let index = 1;
            index < perfectDates.length;
            index += 1
        ) {
            const previousDate = dateFromKey(
                perfectDates[index - 1]
            );

            const expectedDate = new Date(previousDate);
            expectedDate.setDate(expectedDate.getDate() + 1);

            if (
                formatDateKey(expectedDate) === perfectDates[index]
            ) {
                currentStreak += 1;
                bestStreak = Math.max(
                    bestStreak,
                    currentStreak
                );
            } else {
                currentStreak = 1;
            }
        }

        return bestStreak;
    }

    function renderWeeklyChart() {
        const canvas = elements.weeklyChart;

        if (!canvas) {
            return;
        }

        const data = Storage.getData();
        const activeHabits = data.habits.filter(
            (habit) => habit.active
        );

        const endDate = dateFromKey(state.selectedDate);
        const chartData = [];

        for (let offset = 6; offset >= 0; offset -= 1) {
            const date = new Date(endDate);
            date.setDate(endDate.getDate() - offset);

            const dateKey = formatDateKey(date);

            const completed = activeHabits.filter(
                (habit) =>
                    data.checklists[dateKey]?.[habit.id] === true
            ).length;

            const percentage = activeHabits.length
                ? Math.round(
                    (completed / activeHabits.length) * 100
                )
                : 0;

            chartData.push({
                date,
                percentage
            });
        }

        drawBarChart(canvas, chartData);
    }

    function drawBarChart(canvas, chartData) {
        const rectangle = canvas.getBoundingClientRect();

        if (rectangle.width < 20 || rectangle.height < 20) {
            return;
        }

        const ratio = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        canvas.width = Math.round(rectangle.width * ratio);
        canvas.height = Math.round(rectangle.height * ratio);

        const context = canvas.getContext("2d");
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(
            0,
            0,
            rectangle.width,
            rectangle.height
        );

        const styles = getComputedStyle(document.body);

        const primaryColor =
            styles.getPropertyValue("--primary").trim();

        const mutedColor =
            styles.getPropertyValue("--muted").trim();

        const borderColor =
            styles.getPropertyValue("--border").trim();

        const padding = {
            top: 22,
            right: 8,
            bottom: 34,
            left: 31
        };

        const chartWidth =
            rectangle.width - padding.left - padding.right;

        const chartHeight =
            rectangle.height - padding.top - padding.bottom;

        context.font =
            "10px Inter, system-ui, sans-serif";

        context.textAlign = "right";
        context.textBaseline = "middle";
        context.fillStyle = mutedColor;
        context.strokeStyle = borderColor;
        context.lineWidth = 1;

        [0, 50, 100].forEach((value) => {
            const y =
                padding.top +
                chartHeight -
                (value / 100) * chartHeight;

            context.beginPath();
            context.moveTo(padding.left, y);
            context.lineTo(
                rectangle.width - padding.right,
                y
            );
            context.stroke();

            context.fillText(
                `${value}%`,
                padding.left - 6,
                y
            );
        });

        const slotWidth = chartWidth / chartData.length;
        const barWidth = Math.min(
            29,
            slotWidth * 0.54
        );

        chartData.forEach((item, index) => {
            const x =
                padding.left +
                index * slotWidth +
                (slotWidth - barWidth) / 2;

            const barHeight =
                (item.percentage / 100) * chartHeight;

            const y =
                padding.top + chartHeight - barHeight;

            const gradient = context.createLinearGradient(
                0,
                y,
                0,
                padding.top + chartHeight
            );

            gradient.addColorStop(0, primaryColor);
            gradient.addColorStop(
                1,
                "rgba(22, 135, 255, 0.24)"
            );

            context.fillStyle = gradient;

            drawRoundedRectangle(
                context,
                x,
                y,
                barWidth,
                Math.max(barHeight, 3),
                7
            );

            context.fill();

            context.fillStyle = mutedColor;
            context.textAlign = "center";
            context.textBaseline = "top";

            const dayLabel = new Intl.DateTimeFormat(
                "id-ID",
                {
                    weekday: "short"
                }
            )
                .format(item.date)
                .replace(".", "");

            context.fillText(
                dayLabel,
                x + barWidth / 2,
                padding.top + chartHeight + 10
            );
        });
    }

    function drawRoundedRectangle(
        context,
        x,
        y,
        width,
        height,
        radius
    ) {
        const safeRadius = Math.min(
            radius,
            width / 2,
            height / 2
        );

        context.beginPath();
        context.moveTo(x + safeRadius, y);
        context.lineTo(x + width - safeRadius, y);
        context.quadraticCurveTo(
            x + width,
            y,
            x + width,
            y + safeRadius
        );

        context.lineTo(
            x + width,
            y + height - safeRadius
        );

        context.quadraticCurveTo(
            x + width,
            y + height,
            x + width - safeRadius,
            y + height
        );

        context.lineTo(
            x + safeRadius,
            y + height
        );

        context.quadraticCurveTo(
            x,
            y + height,
            x,
            y + height - safeRadius
        );

        context.lineTo(x, y + safeRadius);

        context.quadraticCurveTo(
            x,
            y,
            x + safeRadius,
            y
        );

        context.closePath();
    }

    function toggleTheme() {
        const lightTheme =
            !document.body.classList.contains(
                "light-theme"
            );

        document.body.classList.toggle(
            "light-theme",
            lightTheme
        );

        Storage.setTheme(
            lightTheme ? "light" : "dark"
        );

        elements.themeButton.textContent =
            lightTheme ? "☀" : "◐";

        renderWeeklyChart();
    }

    function applySavedTheme() {
        const data = Storage.getData();
        const lightTheme =
            data.settings.theme === "light";

        document.body.classList.toggle(
            "light-theme",
            lightTheme
        );

        elements.themeButton.textContent =
            lightTheme ? "☀" : "◐";
    }

    function exportApplicationData() {
        const payload = Storage.createExportPayload();
        const fileContent = JSON.stringify(
            payload,
            null,
            2
        );

        const blob = new Blob(
            [fileContent],
            {
                type: "application/json"
            }
        );

        const downloadUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");

        downloadLink.href = downloadUrl;
        downloadLink.download =
            `saju-habit-backup-${formatDateKey(
                new Date()
            )}.json`;

        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();

        URL.revokeObjectURL(downloadUrl);

        showToast("Data berhasil diekspor ke JSON.");
    }

    async function handleImportFile(event) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast(
                "Ukuran file melebihi batas 5 MB.",
                true
            );

            event.target.value = "";
            return;
        }

        try {
            const fileText = await file.text();
            const payload = JSON.parse(fileText);

            openConfirmModal({
                title: "Impor Data",
                message:
                    "Data saat ini akan diganti dengan isi file cadangan yang dipilih.",
                actionText: "Impor",
                action: () => {
                    try {
                        Storage.importData(payload);
                        applySavedTheme();
                        renderAll();

                        showToast(
                            "Data berhasil diimpor."
                        );
                    } catch (error) {
                        showToast(
                            error.message ||
                            "File gagal diimpor.",
                            true
                        );
                    }
                }
            });
        } catch (error) {
            showToast(
                "File JSON rusak atau tidak valid.",
                true
            );
        } finally {
            event.target.value = "";
        }
    }

    function confirmDeleteAllData() {
        openConfirmModal({
            title: "Hapus Semua Data",
            message:
                "Seluruh habit, checklist, statistik, dan riwayat di perangkat ini akan dihapus permanen.",
            actionText: "Hapus Semua",
            action: () => {
                Storage.resetData();
                applySavedTheme();
                renderAll();

                showToast(
                    "Seluruh data Saju Habit telah dihapus."
                );
            }
        });
    }

    function showToast(message, error = false) {
        window.clearTimeout(state.toastTimer);

        elements.toast.textContent = message;
        elements.toast.classList.toggle(
            "is-error",
            error
        );

        elements.toast.classList.add("is-visible");

        state.toastTimer = window.setTimeout(() => {
            elements.toast.classList.remove(
                "is-visible"
            );
        }, 2800);
    }

    function formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function createMonthDateKey(year, month, day) {
        return `${year}-${String(month).padStart(
            2,
            "0"
        )}-${String(day).padStart(2, "0")}`;
    }

    function dateFromKey(dateKey) {
        const [year, month, day] = dateKey
            .split("-")
            .map(Number);

        return new Date(year, month - 1, day);
    }

    function isToday(dateKey) {
        return dateKey === formatDateKey(new Date());
    }

    function formatFullDate(date) {
        return new Intl.DateTimeFormat(
            "id-ID",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(date);
    }

    function formatShortDate(date) {
        return new Intl.DateTimeFormat(
            "id-ID",
            {
                day: "numeric",
                month: "short"
            }
        ).format(date);
    }
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./sw.js", {
                scope: "./"
            })
            .then((registration) => {
                registration.update();

                console.log(
                    "Saju Habit siap digunakan secara offline."
                );
            })
            .catch((error) => {
                console.error(
                    "Service worker gagal didaftarkan:",
                    error
                );
            });
    });
}