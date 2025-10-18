;; AuraVault: The core logic for Aura Finance.
;; This contract holds user STX deposits and mints aBTC against future yield.

;; --- Constants and Errors ---

(define-constant ERR-UNAUTHORIZED u101)
(define-constant ERR-DEPOSIT-ZERO u102)
(define-constant ERR-MINT-ZERO u103)
(define-constant ERR-INSUFFICIENT-DEPOSIT u104)
(define-constant STX-USD-PRICE-ORACLE u200000000) ;; Represents $2.00 with 8 decimals

;; This is the official address of our aBTC token contract.
(define-constant aBTC-contract 'ST2QAEK3CTB4XNAV6R9GXXM162Z0ZWWD63PT8B20J.aBTC-token-v2)


;; --- Data Storage ---

;; Stores the contract owner, who has admin privileges.
(define-data-var contract-owner principal tx-sender)

;; Stores the Loan-to-Value ratio. e.g., u5000 means 50.00%
(define-data-var LTV uint u5000)

;; Maps a user's principal to their total STX deposit.
(define-map stx-deposits principal uint)

;; Maps a user's principal to their total aBTC debt.
(define-map aBTC-debt principal uint)


;; --- Public Functions ---

(define-public (deposit (amount uint))
  (begin
    ;; Ensure the user is depositing a non-zero amount.
    (asserts! (> amount u0) (err ERR-DEPOSIT-ZERO))

    ;; Transfer the STX from the user to this contract.
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

    ;; Get the user's current deposit balance, defaulting to 0 if none exists.
    (let ((current-balance (get-balance tx-sender)))
      ;; Update the user's deposit balance in our map.
      (map-set stx-deposits tx-sender (+ current-balance amount))
      (ok true)
    )
  )
)

(define-public (mint (amount-to-mint uint))
  (begin
    ;; Ensure the user is minting a non-zero amount.
    (asserts! (> amount-to-mint u0) (err ERR-MINT-ZERO))

    (let
      (
        ;; Store the caller's address before we use as-contract
        (caller tx-sender)
        ;; Get the user's total STX deposit (which has 6 decimals).
        (stx-balance (get-balance tx-sender))
        ;; Get the user's current aBTC debt.
        (current-debt (get-debt tx-sender))
      )
      ;; Ensure the user has deposited some STX.
      (asserts! (> stx-balance u0) (err ERR-INSUFFICIENT-DEPOSIT))

      ;; --- Calculate Borrowing Power ---
      ;; 1. Value of STX deposit in USD (with 8 decimals, like aBTC).
      ;;    (stx-balance * $2.00) / 10^6 to adjust for STX's 6 decimals.
      (let
        (
          (stx-value-in-usd (/ (* stx-balance STX-USD-PRICE-ORACLE) u1000000))
        )

        ;; 2. Calculate the maximum amount a user can borrow based on LTV.
        ;;    (stx-value * 50.00%) / 10000 to adjust for LTV scaling.
        (let
          (
            (max-borrowable-aBTC (/ (* stx-value-in-usd (var-get LTV)) u10000))
            (new-total-debt (+ current-debt amount-to-mint))
          )

          ;; 3. SECURITY CHECK: Ensure new total debt does not exceed the max allowed.
          (asserts! (<= new-total-debt max-borrowable-aBTC) (err ERR-INSUFFICIENT-DEPOSIT))

          ;; 4. Mint the new aBTC tokens to the user by calling our token contract.
          ;; Use as-contract so the contract itself is the tx-sender for the mint call
          (try! (as-contract (contract-call? aBTC-contract mint amount-to-mint caller)))

          ;; 5. Update the user's debt balance in our map.
          (map-set aBTC-debt caller new-total-debt)

          (ok true)
        )
      )
    )
  )
)


;; --- Read-Only Functions ---

;; A helper function to get a user's STX deposit balance.
(define-read-only (get-balance (owner principal))
  (default-to u0 (map-get? stx-deposits owner))
)

;; A helper function to get a user's aBTC debt balance.
(define-read-only (get-debt (owner principal))
  (default-to u0 (map-get? aBTC-debt owner))
)