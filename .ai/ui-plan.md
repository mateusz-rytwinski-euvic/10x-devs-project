# Architektura UI dla 10x-Physio

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla aplikacji 10x-Physio została zaprojektowana jako Single-Page Application (SPA) w oparciu o React, TypeScript i Vite. Celem jest zapewnienie płynnego, responsywnego i intuicyjnego doświadczenia dla fizjoterapeutów. Aplikacja wykorzystuje bibliotekę Fluent UI 2 do budowy spójnego interfejsu oraz React Query do zarządzania stanem serwera, co zapewnia wydajną komunikację z API i optymistyczne aktualizacje.

Nawigacja opiera się na zagnieżdżonych ścieżkach, co umożliwia głębokie linkowanie i obsługę historii przeglądarki. Architektura jest zorientowana na zadania, prowadząc użytkownika przez kluczowe procesy: od zarządzania pacjentami, przez dokumentowanie wizyt, aż po generowanie i zapisywanie zaleceń wspomaganych przez AI. Centralnym elementem jest kontekst autentykacji (`useAuth`), który zarządza sesją użytkownika i zabezpiecza dostęp do chronionych zasobów.

## 2. Lista widoków

### Widok: Logowanie (Login)
- **Ścieżka:** `/login`
- **Główny cel:** Umożliwienie zalogowania się zarejestrowanemu użytkownikowi.
- **Kluczowe informacje do wyświetlenia:** Formularz z polami na e-mail i hasło.
- **Kluczowe komponenty widoku:** `TextField` (e-mail, hasło), `PrimaryButton` (Zaloguj), link do strony rejestracji.
- **UX, dostępność i względy bezpieczeństwa:** Komunikaty o błędach (np. "Nieprawidłowe dane logowania") wyświetlane w formularzu. Przycisk "Zaloguj" jest nieaktywny podczas wysyłania żądania. Po pomyślnym zalogowaniu następuje przekierowanie do `/patients`.

### Widok: Rejestracja (Sign Up)
- **Ścieżka:** `/signup`
- **Główny cel:** Umożliwienie nowym użytkownikom założenia konta.
- **Kluczowe informacje do wyświetlenia:** Formularz z polami na imię, nazwisko, e-mail i hasło.
- **Kluczowe komponenty widoku:** `TextField` (imię, nazwisko, e-mail, hasło), `PrimaryButton` (Zarejestruj), link do strony logowania.
- **UX, dostępność i względy bezpieczeństwa:** Walidacja pól formularza w czasie rzeczywistym (np. siła hasła, format e-maila). Komunikaty o błędach (np. "Email jest już zajęty") wyświetlane przy odpowiednich polach.

### Widok: Lista Pacjentów (Patients List)
- **Ścieżka:** `/patients`
- **Główny cel:** Wyświetlenie listy pacjentów przypisanych do zalogowanego terapeuty oraz umożliwienie szybkiego wyszukiwania i dodawania nowych pacjentów.
- **Kluczowe informacje do wyświetlenia:** Tabela z kolumnami: Imię, Nazwisko, Data ostatniej wizyty, Liczba wizyt.
- **Kluczowe komponenty widoku:** `SearchBox` (wyszukiwanie), `DetailsList` (lista pacjentów), `PrimaryButton` (Dodaj pacjenta), `Pagination` (kontrola stron), `Shimmer` (szkielet ładowania).
- **UX, dostępność i względy bezpieczeństwa:** Domyślny widok po zalogowaniu. Wyszukiwanie filtruje listę dynamicznie. Kliknięcie wiersza przenosi do widoku szczegółów pacjenta. Dostęp chroniony (tylko dla zalogowanych użytkowników).

### Widok: Szczegóły Pacjenta (Patient Details)
- **Ścieżka:** `/patients/{patientId}`
- **Główny cel:** Zapewnienie kompleksowego wglądu w dane i historię leczenia pacjenta.
- **Kluczowe informacje do wyświetlenia:** Dane demograficzne pacjenta, historia wizyt.
- **Kluczowe komponenty widoku:** `Breadcrumb` (nawigacja okruszkowa), `Pivot` (zakładki: "Dane Pacjenta", "Historia Wizyt"), `DetailsList` (w zakładce "Historia Wizyt"), `PrimaryButton` (Edytuj dane, Dodaj wizytę).
- **UX, dostępność i względy bezpieczeństwa:** Zakładkowa nawigacja ułatwia przełączanie kontekstu. Widok obsługuje ETagi do zarządzania współbieżnością podczas edycji danych pacjenta.

### Widok: Formularz Wizyty (Visit Form - Create/Edit)
- **Ścieżka:** `/patients/{patientId}/visits/new` lub `/patients/{patientId}/visits/{visitId}`
- **Główny cel:** Umożliwienie dodawania lub edycji wizyty, w tym generowanie i zapisywanie zaleceń AI.
- **Kluczowe informacje do wyświetlenia:** Data wizyty, opis wizyty (wywiad, badanie), pole na zalecenia.
- **Kluczowe komponenty widoku:** `DatePicker` (data wizyty), `TextField` (opis wizyty, zalecenia - oba pola wieloliniowe), `PrimaryButton` ("Generuj zalecenia AI", "Zapisz zalecenia", "Zapisz wizytę"), `Spinner` (wskaźnik ładowania), `MessageBar` (ostrzeżenie o weryfikacji AI).
- **UX, dostępność i względy bezpieczeństwa:** Przycisk "Generuj zalecenia AI" jest nieaktywny, dopóki opis wizyty nie osiągnie minimalnej długości. Wyraźne ostrzeżenie informuje o konieczności weryfikacji sugestii AI. Zapis zaleceń i wizyty to osobne akcje, co daje użytkownikowi pełną kontrolę.

## 3. Mapa podróży użytkownika

Główny przepływ pracy (happy path) obejmuje fizjoterapeutę dokumentującego wizytę i generującego zalecenia:

1.  **Logowanie:** Użytkownik wchodzi na `/login`, wprowadza dane i zostaje przekierowany na `/patients`.
2.  **Wybór pacjenta:** Na liście pacjentów (`/patients`) użytkownik znajduje pacjenta (za pomocą wyszukiwania lub przewijania) i klika jego rekord, przechodząc do `/patients/{patientId}`.
3.  **Dodawanie wizyty:** W widoku szczegółów pacjenta, na zakładce "Historia Wizyt", klika "Dodaj wizytę", co przenosi go do formularza nowej wizyty (`/patients/{patientId}/visits/new`).
4.  **Dokumentowanie wizyty:** Użytkownik ustawia datę wizyty i wprowadza szczegółowy opis w polu "Opis wizyty".
5.  **Generowanie zaleceń AI:** Po wprowadzeniu opisu, przycisk "Generuj zalecenia AI" staje się aktywny. Użytkownik klika go, co wyzwala żądanie do API. W trakcie generowania przycisk jest nieaktywny, a obok niego pojawia się `Spinner`.
6.  **Edycja i akceptacja:** Wygenerowane przez AI zalecenia pojawiają się w edytowalnym polu tekstowym. Użytkownik weryfikuje treść, dokonuje niezbędnych korekt.
7.  **Zapisanie zaleceń:** Użytkownik klika "Zapisz zalecenia", co utrwala je w systemie dla danej wizyty.
8.  **Zakończenie:** Użytkownik wraca do historii wizyt pacjenta, gdzie nowa wizyta wraz z zapisanymi zaleceniami jest już widoczna.

## 4. Układ i struktura nawigacji

Aplikacja będzie miała prosty, ale funkcjonalny układ główny, który będzie obejmował:
- **Nagłówek (Header):** Zawierający logo aplikacji oraz przycisk "Wyloguj" dla zalogowanych użytkowników.
- **Główna treść (Main Content):** Obszar, w którym renderowane są poszczególne widoki (`/login`, `/patients`, `/patients/{id}` itd.).
- **Nawigacja okruszkowa (Breadcrumb):** Widoczna w zagnieżdżonych widokach (np. "Pacjenci > Jan Nowak > Wizyta 2025-11-10"), ułatwiająca orientację i powrót do poprzednich poziomów.

Struktura ścieżek (routing):
- `/login` - Strona logowania
- `/signup` - Strona rejestracji
- `/patients` - Lista pacjentów (widok chroniony)
- `/patients/new` - Formularz dodawania nowego pacjenta (może być jako modal na liście pacjentów)
- `/patients/{patientId}` - Szczegóły pacjenta (widok chroniony)
- `/patients/{patientId}/edit` - Formularz edycji pacjenta (może być jako modal)
- `/patients/{patientId}/visits/new` - Formularz dodawania nowej wizyty (widok chroniony)
- `/patients/{patientId}/visits/{visitId}` - Formularz edycji wizyty (widok chroniony)

Komponent `PrivateRoute` będzie chronił wszystkie ścieżki z wyjątkiem `/login` i `/signup`, przekierowując niezalogowanych użytkowników na stronę logowania.

## 5. Kluczowe komponenty

Poniżej znajduje się lista kluczowych, reużywalnych komponentów Fluent UI 2, które będą stanowić podstawę interfejsu:

- **`DetailsList`:** Do wyświetlania danych tabelarycznych (lista pacjentów, historia wizyt). Umożliwia sortowanie, zaznaczanie i renderowanie niestandardowych komórek.
- **`TextField`:** Standardowe pole do wprowadzania tekstu, używane w formularzach (logowanie, rejestracja, dane pacjenta) oraz jako wieloliniowe pole tekstowe (opis wizyty, zalecenia).
- **`PrimaryButton`:** Główny przycisk akcji (np. "Zapisz", "Zaloguj", "Generuj zalecenia AI").
- **`SearchBox`:** Pole wyszukiwania zintegrowane z listą pacjentów.
- **`Pivot`:** Komponent zakładek używany w widoku szczegółów pacjenta do oddzielenia danych demograficznych od historii wizyt.
- **`Spinner`:** Wskaźnik ładowania używany do sygnalizowania operacji w toku (np. generowanie AI, logowanie).
- **`Shimmer`:** Komponent typu "skeleton loader" do wyświetlania szkieletu interfejsu podczas ładowania danych list (np. `DetailsList`).
- **`MessageBar`:** Do wyświetlania globalnych powiadomień, ostrzeżeń (np. o weryfikacji AI) i komunikatów o błędach.
- **`Pagination`:** Komponent do nawigacji po stronach dla list z dużą ilością danych.
- **`PrivateRoute`:** Komponent HOC (Higher-Order Component) lub wrapper, który sprawdza stan autentykacji i chroni zdefiniowane ścieżki.
