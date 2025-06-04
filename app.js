// System Rezerwacji Biurek - Logika JavaScript
class ReservationSystem {
    constructor() {
        this.jsonUrl = 'https://wilanpl.github.io/biuro-rezerwacje-data/data.json'; // URL do pliku JSON - do zmiany przy wdrożeniu
        this.storageKey = 'reservation_data';
        this.limits = { poranna: 5, popoludniowa: 8 };
        
        this.initializeData();
        this.bindEvents();
        this.setDefaultDates();
        this.loadReservations();
    }

    // Inicjalizacja danych z localStorage lub domyślnych
    initializeData() {
        const savedData = localStorage.getItem(this.storageKey);
        if (!savedData) {
            const defaultData = {
                rezerwacje: {
                    "2025-06-04": {
                        poranna: [
                            { id: 1, imie: "Jan Kowalski", timestamp: "2025-06-03T10:30:00Z" },
                            { id: 2, imie: "Anna Nowak", timestamp: "2025-06-03T11:15:00Z" }
                        ],
                        popoludniowa: [
                            { id: 3, imie: "Piotr Wiśniewski", timestamp: "2025-06-03T12:00:00Z" }
                        ]
                    },
                    "2025-06-05": {
                        poranna: [
                            { id: 4, imie: "Maria Kowalczyk", timestamp: "2025-06-03T14:20:00Z" }
                        ],
                        popoludniowa: []
                    }
                },
                lastUpdated: new Date().toISOString(),
                limity: this.limits
            };
            localStorage.setItem(this.storageKey, JSON.stringify(defaultData));
        }
    }

    // Pobranie danych z localStorage
    getData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : null;
    }

    // Zapisanie danych do localStorage
    saveData(data) {
        data.lastUpdated = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    // Bindowanie eventów
    bindEvents() {
        // Formularz rezerwacji
        document.getElementById('reservation-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleReservation();
        });

        // Przełączanie trybu pracy
        document.querySelectorAll('input[name="work-mode"]').forEach(radio => {
            radio.addEventListener('change', this.toggleShiftVisibility.bind(this));
        });

        // Anulowanie rezerwacji
        document.getElementById('cancel-reservation').addEventListener('click', this.handleCancellation.bind(this));

        // Zmiana daty podglądu
        document.getElementById('view-date').addEventListener('change', this.loadReservations.bind(this));

        // Odświeżanie danych
        document.getElementById('refresh-data').addEventListener('click', this.refreshData.bind(this));

        // Eksport CSV
        document.getElementById('export-csv').addEventListener('click', this.exportToCSV.bind(this));
    }

    // Ustawienie domyślnych dat
    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        document.getElementById('view-date').value = today;
    }

    // Przełączanie widoczności sekcji zmian
    toggleShiftVisibility() {
        const workMode = document.querySelector('input[name="work-mode"]:checked').value;
        const shiftGroup = document.getElementById('shift-group');
        
        if (workMode === 'remote') {
            shiftGroup.classList.add('hidden');
        } else {
            shiftGroup.classList.remove('hidden');
        }
    }

    // Obsługa rezerwacji
    handleReservation() {
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        const data = this.getData();
        const dateKey = formData.date;

        // Inicjalizacja daty jeśli nie istnieje
        if (!data.rezerwacje[dateKey]) {
            data.rezerwacje[dateKey] = { poranna: [], popoludniowa: [] };
        }

        // Sprawdzenie czy praca zdalna
        if (formData.workMode === 'remote') {
            this.addRemoteWork(data, dateKey, formData);
        } else {
            // Sprawdzenie dostępności miejsc
            if (!this.checkAvailability(data, dateKey, formData.shift)) {
                this.showMessage('Brak dostępnych miejsc na wybraną zmianę!', 'error');
                return;
            }

            // Dodanie rezerwacji
            this.addOfficeReservation(data, dateKey, formData);
        }

        this.saveData(data);
        this.showMessage('Rezerwacja została pomyślnie dodana!', 'success');
        this.clearForm();
        this.loadReservations();
    }

    // Pobranie danych z formularza
    getFormData() {
        return {
            date: document.getElementById('date').value,
            workMode: document.querySelector('input[name="work-mode"]:checked').value,
            shift: document.querySelector('input[name="shift"]:checked')?.value || null,
            employeeName: document.getElementById('employee-name').value.trim()
        };
    }

    // Walidacja formularza
    validateForm(formData) {
        if (!formData.date) {
            this.showMessage('Proszę wybrać datę!', 'error');
            return false;
        }

        if (!formData.employeeName) {
            this.showMessage('Proszę wprowadzić imię i nazwisko!', 'error');
            return false;
        }

        if (formData.workMode === 'office' && !formData.shift) {
            this.showMessage('Proszę wybrać zmianę dla pracy w biurze!', 'error');
            return false;
        }

        return true;
    }

    // Sprawdzenie dostępności miejsc
    checkAvailability(data, dateKey, shift) {
        if (!data.rezerwacje[dateKey]) return true;
        
        const currentCount = data.rezerwacje[dateKey][shift]?.length || 0;
        const limit = this.limits[shift];
        
        return currentCount < limit;
    }

    // Dodanie pracy zdalnej
    addRemoteWork(data, dateKey, formData) {
        // Praca zdalna nie wymaga rezerwacji miejsca, ale rejestrujemy ją
        if (!data.rezerwacje[dateKey].zdalna) {
            data.rezerwacje[dateKey].zdalna = [];
        }
        
        const reservation = {
            id: this.generateId(),
            imie: formData.employeeName,
            timestamp: new Date().toISOString()
        };
        
        data.rezerwacje[dateKey].zdalna.push(reservation);
    }

    // Dodanie rezerwacji biura
    addOfficeReservation(data, dateKey, formData) {
        const reservation = {
            id: this.generateId(),
            imie: formData.employeeName,
            timestamp: new Date().toISOString()
        };
        
        data.rezerwacje[dateKey][formData.shift].push(reservation);
    }

    // Generowanie unikalnego ID
    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    // Obsługa anulowania rezerwacji
    handleCancellation() {
        const employeeName = document.getElementById('employee-name').value.trim();
        const date = document.getElementById('date').value;

        if (!employeeName) {
            this.showMessage('Wprowadź swoje imię i nazwisko aby anulować rezerwację!', 'error');
            return;
        }

        if (!date) {
            this.showMessage('Wybierz datę rezerwacji do anulowania!', 'error');
            return;
        }

        const data = this.getData();
        let cancelled = false;

        if (data.rezerwacje[date]) {
            // Sprawdzenie w zmianach biurowych
            ['poranna', 'popoludniowa'].forEach(shift => {
                if (data.rezerwacje[date][shift]) {
                    const index = data.rezerwacje[date][shift].findIndex(
                        res => res.imie.toLowerCase() === employeeName.toLowerCase()
                    );
                    if (index !== -1) {
                        data.rezerwacje[date][shift].splice(index, 1);
                        cancelled = true;
                    }
                }
            });

            // Sprawdzenie w pracy zdalnej
            if (data.rezerwacje[date].zdalna) {
                const index = data.rezerwacje[date].zdalna.findIndex(
                    res => res.imie.toLowerCase() === employeeName.toLowerCase()
                );
                if (index !== -1) {
                    data.rezerwacje[date].zdalna.splice(index, 1);
                    cancelled = true;
                }
            }
        }

        if (cancelled) {
            this.saveData(data);
            this.showMessage('Rezerwacja została anulowana!', 'success');
            this.clearForm();
            this.loadReservations();
        } else {
            this.showMessage('Nie znaleziono rezerwacji dla podanej osoby!', 'error');
        }
    }

    // Ładowanie rezerwacji do tabeli
    loadReservations() {
        const date = document.getElementById('view-date').value;
        const data = this.getData();
        
        this.updateAvailabilityStats(data, date);
        this.renderReservationsTable(data, date);
    }

    // Aktualizacja statystyk dostępności
    updateAvailabilityStats(data, date) {
        const dayData = data.rezerwacje[date] || { poranna: [], popoludniowa: [] };
        
        const morningUsed = dayData.poranna?.length || 0;
        const afternoonUsed = dayData.popoludniowa?.length || 0;
        
        const morningAvailable = this.limits.poranna - morningUsed;
        const afternoonAvailable = this.limits.popoludniowa - afternoonUsed;
        
        document.getElementById('morning-availability').textContent = 
            `${morningAvailable}/${this.limits.poranna}`;
        document.getElementById('afternoon-availability').textContent = 
            `${afternoonAvailable}/${this.limits.popoludniowa}`;
    }

    // Renderowanie tabeli rezerwacji
    renderReservationsTable(data, date) {
        const tbody = document.getElementById('reservations-tbody');
        const dayData = data.rezerwacje[date];
        
        if (!dayData) {
            tbody.innerHTML = '<tr><td colspan="4" class="no-data">Brak rezerwacji na wybrany dzień</td></tr>';
            return;
        }

        let rows = [];

        // Rezerwacje biurowe - poranna
        if (dayData.poranna) {
            dayData.poranna.forEach(res => {
                rows.push(this.createTableRow(res, 'W biurze', 'Poranna (8:00-10:00)'));
            });
        }

        // Rezerwacje biurowe - popołudniowa
        if (dayData.popoludniowa) {
            dayData.popoludniowa.forEach(res => {
                rows.push(this.createTableRow(res, 'W biurze', 'Popołudniowa (10:00-14:00)'));
            });
        }

        // Praca zdalna
        if (dayData.zdalna) {
            dayData.zdalna.forEach(res => {
                rows.push(this.createTableRow(res, 'Zdalnie', '-'));
            });
        }

        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="no-data">Brak rezerwacji na wybrany dzień</td></tr>';
        } else {
            tbody.innerHTML = rows.join('');
        }
    }

    // Tworzenie wiersza tabeli
    createTableRow(reservation, workMode, shift) {
        const date = new Date(reservation.timestamp);
        const formattedDate = date.toLocaleString('pl-PL');
        
        const workModeBadge = workMode === 'W biurze' ? 
            '<span class="work-mode-badge work-mode-badge--office">W biurze</span>' :
            '<span class="work-mode-badge work-mode-badge--remote">Zdalnie</span>';
            
        const shiftBadge = shift !== '-' ? 
            `<span class="shift-badge">${shift}</span>` : '-';

        return `
            <tr>
                <td>${reservation.imie}</td>
                <td>${workModeBadge}</td>
                <td>${shiftBadge}</td>
                <td>${formattedDate}</td>
            </tr>
        `;
    }

    // Eksport do CSV
    exportToCSV() {
        const date = document.getElementById('view-date').value;
        const data = this.getData();
        const dayData = data.rezerwacje[date];
        
        if (!dayData) {
            this.showMessage('Brak danych do eksportu dla wybranej daty!', 'error');
            return;
        }

        let csvContent = 'Imię i Nazwisko,Tryb Pracy,Zmiana,Czas Rezerwacji\n';
        
        // Eksport rezerwacji biurowych
        ['poranna', 'popoludniowa'].forEach(shift => {
            if (dayData[shift]) {
                dayData[shift].forEach(res => {
                    const shiftName = shift === 'poranna' ? 'Poranna (8:00-10:00)' : 'Popołudniowa (10:00-14:00)';
                    const formattedDate = new Date(res.timestamp).toLocaleString('pl-PL');
                    csvContent += `"${res.imie}","W biurze","${shiftName}","${formattedDate}"\n`;
                });
            }
        });

        // Eksport pracy zdalnej
        if (dayData.zdalna) {
            dayData.zdalna.forEach(res => {
                const formattedDate = new Date(res.timestamp).toLocaleString('pl-PL');
                csvContent += `"${res.imie}","Zdalnie","-","${formattedDate}"\n`;
            });
        }

        // Pobieranie pliku
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `rezerwacje_${date}.csv`;
        link.click();

        this.showMessage('Dane zostały wyeksportowane do pliku CSV!', 'success');
    }

    // Odświeżanie danych
    refreshData() {
        // Tutaj w rzeczywistej implementacji byłoby pobieranie z zewnętrznego API
        this.showMessage('Dane zostały odświeżone!', 'info');
        this.loadReservations();
    }

    // Wyświetlenie komunikatu
    showMessage(message, type) {
        const messageDiv = document.getElementById('form-message');
        messageDiv.textContent = message;
        messageDiv.className = `mt-8 ${type}`;
        messageDiv.classList.remove('hidden');
        
        // Automatyczne ukrycie po 5 sekundach
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    }

    // Czyszczenie formularza
    clearForm() {
        document.getElementById('reservation-form').reset();
        this.setDefaultDates();
        document.getElementById('office-mode').checked = true;
        this.toggleShiftVisibility();
    }
}

// Inicjalizacja systemu po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    new ReservationSystem();
});

// Funkcja pomocnicza do pobierania danych z zewnętrznego JSON (dla przyszłego użycia)
async function fetchExternalData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Błąd pobierania danych:', error);
        throw error;
    }
}

// Funkcja pomocnicza do wysyłania danych do zewnętrznego API (dla przyszłego użycia)
async function sendExternalData(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Błąd wysyłania danych:', error);
        throw error;
    }
}