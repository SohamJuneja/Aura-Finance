;; This is a simple read-only function that returns a string.
;; It's the perfect test to see if our deployment is working.

(define-read-only (say-hello)
  (ok "Hello, Aura Finance!")
)