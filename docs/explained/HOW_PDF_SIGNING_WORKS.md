# How PDF Digital Signing Works in Record+

*A plain-language explanation of what happens when Record+ signs a document, why Adobe was rejecting our signatures, and how we fixed it.*

---

## What is a digital signature?

When you sign a paper document with a pen, your signature proves it came from you. Digital documents work the same way - there is a mathematical signature that proves the document was signed by a specific person using their certificate.

In Record+'s case, that certificate is the ACA certificate (Autoridad de Certificacion de la Abogacia) issued to Sonia Camara Gamero. It is the digital equivalent of your handwritten signature, but much harder to forge.

## What Record+ does when you click "Generar Minuta"

1. **Creates the PDF** - fills in the client name, ARAG reference, fee amount (203 + IVA), etc.
2. **Reads your certificate** - opens the .p12 file (which contains your private key, like a secret stamp only you have)
3. **Calculates a fingerprint** - creates a unique mathematical hash of the PDF content (think of it as a unique number that changes if even one character in the document changes)
4. **Signs the fingerprint** - uses your private key to encrypt that fingerprint, creating the digital signature
5. **Packages everything** - wraps the signature, your certificate, and the CA chain into a standard format called PKCS#7
6. **Embeds it in the PDF** - puts the signature package inside a special reserved area in the PDF file

When someone opens the PDF in Adobe Reader, Adobe does the reverse: it recalculates the fingerprint of the document, decrypts your signature using your public certificate, and checks if they match. If they do: green checkmark.

## The problem: Adobe rejected every signature

Record+ was doing all of the above correctly. The math was right. The certificate was valid. The chain was complete. But Adobe kept showing: "Signature is INVALID - There are errors in the formatting."

Why?

## The analogy: a perfectly valid check in the wrong format

Imagine you write a perfectly valid check. The amount is correct, the signature is real, the account exists. But you wrote the date in American format (02/06/2026) instead of Spanish format (06/02/2026). The bank rejects it - not because the check is fake, but because **the format is wrong**.

That is exactly what happened here.

## What was actually wrong

The signature package (PKCS#7) contains a section called "authenticated attributes" - a list of metadata fields like:

- What type of content was signed
- When it was signed
- The fingerprint of the document

International rules say: **these fields must be sorted alphabetically by their encoded form**. This is part of a standard called DER (Distinguished Encoding Rules).

The software library we used to build this package (called node-forge) **did not sort them**. It just wrote them in whatever order it felt like. Someone reported this bug in 2019. Seven years later, they still have not fixed it.

Adobe is strict about these formatting rules. When it sees unsorted fields, it rejects the entire signature - without even checking if the math is valid. It is like the bank throwing away your check without looking at the amount, just because the date format is wrong.

## How we fixed it

We stopped using node-forge to build the signature package. Instead, we now use **OpenSSL** - the same tool that banks, governments, and certificate authorities worldwide use. It is the gold standard that Adobe itself tests against.

The process is now:

1. Record+ creates the PDF invoice
2. It reads the ACA certificate (still using node-forge for this part, which works fine)
3. It hands the data to OpenSSL: "sign this, please"
4. OpenSSL creates a perfectly formatted signature package (fields sorted correctly)
5. We do one small adjustment: remove the embedded copy of the document from the package (Adobe expects to read the document from the PDF itself, not from inside the signature)
6. Record+ puts the signature into the PDF

Because OpenSSL formats everything according to the standard, Adobe accepts it without question.

## The second bug: the invisible space

There was also a simpler bug. The path to the certificate file on the server had an invisible space at the end:

```
/home/appuser/data/certificates/ACA_PLUS_23-07-25.p12
                                                      ^ invisible space here
```

This is like trying to call someone but accidentally adding a space after their phone number. The system tried to find a file with a space in its name, could not find it, and gave up. We added a safety measure so the system now automatically strips extra spaces from the path.

## The result

Adobe now sees a properly formatted signature, checks the math (which was always correct), verifies the certificate chain (SONIA CAMARA GAMERO, issued by ACA 2, trusted by ACA ROOT 2), and shows the green checkmark: **"Signed and all signatures are valid."**

## The trust chain

For anyone curious about why Adobe trusts the signature, here is the chain:

```
ACA ROOT 2  (the root authority - like the government that issues passports)
  |
  +-- ACA 2  (intermediate authority - like the passport office)
        |
        +-- SONIA CAMARA GAMERO  (the signer - like the passport holder)
```

Adobe trusts ACA ROOT 2 as a recognized certificate authority. ACA ROOT 2 vouches for ACA 2. ACA 2 vouches for the personal certificate. Therefore Adobe trusts the signature.

---

*Technical details: see [docs/FIX_ADOBE_PDF_SIGNATURE.md](../FIX_ADOBE_PDF_SIGNATURE.md) for the full engineering document with code references, ASN.1 structures, and deployment steps.*
