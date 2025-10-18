;; SIP-010 Fungible Token: Aura Bitcoin (aBTC)

(define-fungible-token aBTC)

(define-data-var token-uri (optional (string-utf8 256)) none)
(define-data-var contract-owner principal tx-sender)

(define-constant ERR-UNAUTHORIZED u101)

;; --- Public Functions ---

(define-public (get-name)
  (ok "Aura Bitcoin")
)

(define-public (get-symbol)
  (ok "aBTC")
)

(define-public (get-decimals)
  (ok u8)
)

(define-public (get-balance (owner principal))
  (ok (ft-get-balance aBTC owner))
)

(define-public (get-total-supply)
  (ok (ft-get-supply aBTC))
)

(define-public (get-token-uri)
  (ok (var-get token-uri))
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) (err ERR-UNAUTHORIZED))
    (try! (ft-transfer? aBTC amount sender recipient))
    (print memo)
    (ok true)
  )
)

;; --- Admin Functions ---

;; Transfer ownership to another principal (e.g., the vault contract)
(define-public (set-contract-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-UNAUTHORIZED))
    (var-set contract-owner new-owner)
    (ok true)
  )
)

;; The contract owner (initially you, but later our main vault contract)
;; is the only one who can mint new aBTC tokens.
(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-UNAUTHORIZED))
    (ft-mint? aBTC amount recipient)
  )
)