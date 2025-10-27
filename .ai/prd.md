# Dokument wymagań produktu (PRD) - 10x-Physio

## 1. Przegląd produktu
10x-Physio to aplikacja internetowa zaprojektowana w celu optymalizacji pracy fizjoterapeutów. Głównym celem platformy jest automatyzacja procesu tworzenia zaleceń i ćwiczeń domowych dla pacjentów po odbytej wizycie. Dzięki wykorzystaniu sztucznej inteligencji (AI), aplikacja analizuje opis wizyty wprowadzony przez fizjoterapeutę i generuje spersonalizowane sugestie, które mogą być następnie dowolnie edytowane i zatwierdzane. MVP (Minimum Viable Product) skupia się na podstawowych funkcjonalnościach zarządzania pacjentami, wizytami oraz na module AI, odkładając na później bardziej zaawansowane funkcje, takie jak integracje zewnętrzne czy aplikacja mobilna.

## 2. Problem użytkownika
Fizjoterapeuci poświęcają znaczną ilość czasu po każdej wizycie na ręczne przygotowywanie zaleceń i zestawów ćwiczeń dla pacjentów. Proces ten jest powtarzalny i podatny na niespójności, co może prowadzić do tworzenia nieoptymalnych lub generycznych planów terapeutycznych. Ręczne dokumentowanie i tworzenie zaleceń obniża efektywność pracy, ogranicza czas, który mógłby być poświęcony na bezpośrednią pracę z pacjentem lub rozwój zawodowy, a także zwiększa ryzyko błędów. Brak scentralizowanego systemu do śledzenia historii wizyt i zaleceń utrudnia szybki wgląd w przebieg leczenia pacjenta.

## 3. Wymagania funkcjonalne
- RF-001: Uwierzytelnianie użytkowników: System umożliwi fizjoterapeutom tworzenie konta i logowanie się.
- RF-002: Zarządzanie pacjentami (CRUD): Użytkownicy będą mogli dodawać, przeglądać, edytować i usuwać dane pacjentów.
- RF-003: Wyszukiwanie pacjentów: Aplikacja zapewni funkcję wyszukiwania pacjentów po imieniu i nazwisku.
- RF-004: Zarządzanie wizytami (CRUD): Użytkownicy będą mogli dodawać, przeglądać, edytować i usuwać wizyty przypisane do konkretnych pacjentów.
- RF-005: Opis wizyty: Każda wizyta będzie zawierać pole tekstowe do wprowadzenia szczegółowego opisu jej przebiegu.
- RF-006: Generowanie zaleceń przez AI: Na podstawie opisu wizyty, system automatycznie wygeneruje propozycję zaleceń oraz ćwiczeń domowych.
- RF-007: Edycja i akceptacja zaleceń: Fizjoterapeuta będzie miał możliwość edycji treści wygenerowanych przez AI w prostym edytorze tekstowym przed ich finalnym zapisaniem.
- RF-008: Ostrzeżenie o weryfikacji AI: Interfejs będzie zawierał wyraźne ostrzeżenie informujące o konieczności weryfikacji sugestii AI.
- RF-009: Historia pacjenta: System zapewni dostęp do pełnej historii wizyt i zaleceń dla każdego pacjenta w jednym, uporządkowanym widoku.

## 4. Granice produktu
Następujące funkcje nie zostaną uwzględnione w wersji MVP:
- Zaawansowana analityka i raportowanie postępów pacjenta.
- Integracje z zewnętrznymi systemami (np. kalendarze, systemy do e-recept).
- Zaawansowane zarządzanie rolami i uprawnieniami (np. administrator, recepcjonista).
- Dedykowana aplikacja mobilna dla pacjentów lub fizjoterapeutów.
- Automatyczne powiadomienia SMS/e-mail.
- Moduł płatności i fakturowania.

## 5. Historyjki użytkowników

---
- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy fizjoterapeuta, chcę móc założyć konto w systemie, podając swoje dane, abym mógł zacząć korzystać z aplikacji.
- Kryteria akceptacji:
  1. Formularz rejestracji zawiera pola: imię, nazwisko, adres e-mail i hasło.
  2. Hasło musi spełniać minimalne wymagania bezpieczeństwa (np. 8 znaków, jedna duża litera, jedna cyfra).
  3. System waliduje, czy podany adres e-mail nie jest już zarejestrowany.
  4. Po pomyślnej rejestracji jestem automatycznie zalogowany i przekierowany do głównego panelu aplikacji.

---
- ID: US-002
- Tytuł: Logowanie do systemu
- Opis: Jako zarejestrowany fizjoterapeuta, chcę móc zalogować się do systemu przy użyciu mojego adresu e-mail i hasła, aby uzyskać dostęp do danych moich pacjentów.
- Kryteria akceptacji:
  1. Strona logowania zawiera pola na adres e-mail i hasło.
  2. Po poprawnym wprowadzeniu danych jestem przekierowany do głównego panelu.
  3. W przypadku podania błędnych danych, wyświetlany jest komunikat o błędzie.

---
- ID: US-003
- Tytuł: Wylogowanie z systemu
- Opis: Jako zalogowany fizjoterapeuta, chcę móc się wylogować, aby zabezpieczyć dostęp do mojego konta.
- Kryteria akceptacji:
  1. W interfejsie użytkownika znajduje się widoczny przycisk "Wyloguj".
  2. Po kliknięciu przycisku sesja zostaje zakończona, a ja jestem przekierowany na stronę logowania.

---
- ID: US-004
- Tytuł: Dodawanie nowego pacjenta
- Opis: Jako fizjoterapeuta, chcę móc dodać nowego pacjenta do mojej bazy danych, podając jego podstawowe informacje, aby rozpocząć prowadzenie jego dokumentacji.
- Kryteria akceptacji:
  1. Formularz dodawania pacjenta zawiera pola na imię i nazwisko.
  2. Po zapisaniu formularza, nowy pacjent pojawia się na liście pacjentów.
  3. System wyświetla komunikat potwierdzający pomyślne dodanie pacjenta.

---
- ID: US-005
- Tytuł: Przeglądanie listy pacjentów
- Opis: Jako fizjoterapeuta, chcę widzieć listę wszystkich moich pacjentów, aby mieć szybki dostęp do ich profili.
- Kryteria akceptacji:
  1. Domyślny widok po zalogowaniu przedstawia listę pacjentów.
  2. Lista zawiera imię i nazwisko każdego pacjenta.
  3. Każdy element listy jest linkiem do szczegółowego widoku historii pacjenta.

---
- ID: US-006
- Tytuł: Wyszukiwanie pacjenta
- Opis: Jako fizjoterapeuta, chcę móc szybko wyszukać pacjenta po imieniu lub nazwisku, aby sprawnie odnaleźć jego dokumentację.
- Kryteria akceptacji:
  1. Na liście pacjentów znajduje się pole wyszukiwania.
  2. Wpisywanie tekstu w pole wyszukiwania dynamicznie filtruje listę pacjentów w czasie rzeczywistym.
  3. Wyszukiwanie jest niewrażliwe na wielkość liter.

---
- ID: US-007
- Tytuł: Edycja danych pacjenta
- Opis: Jako fizjoterapeuta, chcę mieć możliwość edycji danych pacjenta, aby poprawić ewentualne błędy lub zaktualizować informacje.
- Kryteria akceptacji:
  1. W widoku szczegółów pacjenta znajduje się opcja "Edytuj".
  2. Po jej wybraniu, pola z danymi pacjenta stają się edytowalne.
  3. Po zapisaniu zmian, zaktualizowane dane są widoczne w systemie.

---
- ID: US-008
- Tytuł: Dodawanie nowej wizyty
- Opis: Jako fizjoterapeuta, chcę dodać nową wizytę dla pacjenta i wprowadzić jej opis, aby udokumentować spotkanie.
- Kryteria akceptacji:
  1. W widoku historii pacjenta znajduje się przycisk "Dodaj wizytę".
  2. Formularz dodawania wizyty zawiera co najmniej datę wizyty oraz duże pole tekstowe na jej opis.
  3. Po zapisaniu, nowa wizyta pojawia się w historii wizyt pacjenta.

---
- ID: US-009
- Tytuł: Usuwanie wizyty
- Opis: Jako fizjoterapeuta, chcę mieć możliwość usunięcia wizyty z bazy danych.
- Kryteria akceptacji:
  1. W widoku szczegółów wizyty znajduje się opcja "Usuń".
  2. Przed usunięciem system wyświetla modal z prośbą o potwierdzenie operacji.
  3. Po potwierdzeniu, wizyta jest trwale usuwana z systemu.

---
- ID: US-010
- Tytuł: Generowanie zaleceń przez AI
- Opis: Jako fizjoterapeuta, po wprowadzeniu opisu wizyty, chcę, aby system automatycznie wygenerował dla mnie propozycję zaleceń i ćwiczeń domowych.
- Kryteria akceptacji:
  1. Po zapisaniu opisu wizyty, pod polem tekstowym pojawia się przycisk "Generuj zalecenia AI".
  2. Po kliknięciu przycisku, system w ciągu kilku sekund wyświetla wygenerowaną treść w edytowalnym polu tekstowym.
  3. Nad wygenerowaną treścią widoczne jest ostrzeżenie: "Pamiętaj, aby zweryfikować i dostosować poniższe sugestie. AI może popełniać błędy."

---
- ID: US-011
- Tytuł: Edycja i akceptacja zaleceń AI
- Opis: Jako fizjoterapeuta, chcę mieć możliwość przejrzenia i swobodnej edycji zaleceń wygenerowanych przez AI, aby upewnić się, że są w 100% poprawne i dopasowane do pacjenta, a następnie zapisać je w jego historii.
- Kryteria akceptacji:
  1. Pole tekstowe z wygenerowanymi zaleceniami jest w pełni edytowalne.
  2. Pod polem tekstowym znajduje się przycisk "Zapisz zalecenia".
  3. Po zapisaniu, zalecenia zostają trwale powiązane z daną wizytą i są widoczne w historii pacjenta.

---
- ID: US-012
- Tytuł: Przeglądanie historii wizyt i zaleceń pacjenta
- Opis: Jako fizjoterapeuta, chcę móc w każdej chwili przejrzeć historię wszystkich wizyt i zaleceń danego pacjenta, aby przygotować się do kolejnego spotkania lub przeanalizować przebieg terapii.
- Kryteria akceptacji:
  1. Widok szczegółów pacjenta wyświetla chronologiczną listę wszystkich odbytych wizyt.
  2. Każda pozycja na liście zawiera datę wizyty, jej opis oraz zapisane zalecenia.
  3. Lista jest posortowana od najnowszej do najstarszej wizyty.

## 6. Metryki sukcesu
### Jakościowe:
- System umożliwia szybkie i intuicyjne odnalezienie pełnej historii wizyt i zaleceń dla każdego pacjenta.
- Fizjoterapeuci oceniają sugestie AI jako trafne i pomocne w codziennej pracy.

### Ilościowe (do obserwacji po wdrożeniu MVP):
- Procent zaleceń generowanych przez AI, które są akceptowane przez fizjoterapeutów bez znaczących poprawek (cel: 75%).
- Częstotliwość korzystania z funkcji generowania zaleceń AI przy rejestrowaniu wizyt (cel: użycie w co najmniej 70% wizyt).
- Średni czas spędzony na tworzeniu zaleceń po wizycie (oczekiwany spadek w porównaniu do procesu manualnego).
