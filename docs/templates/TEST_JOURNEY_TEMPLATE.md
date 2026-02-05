# Test Journey: [JOURNEY NAME]

**Date:** YYYY-MM-DD
**Tester:** [Name or Claude Code]
**Environment:** [localhost:3000 | recordplus.work | staging]
**Version/Commit:** [git commit hash or version]

---

## 1. Journey Scope

**Description:** [Brief description of what this test journey covers]

**User Story:** As a [role], I want to [action] so that [benefit].

**Features Tested:**
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

**Out of Scope:**
- [What this test does NOT cover]

---

## 2. Preconditions

### System State
- [ ] Application is running at [URL]
- [ ] Database is in [state - clean/seeded/production-like]
- [ ] User is authenticated as [role]

### Test Data Required
| Data | Value | Notes |
|------|-------|-------|
| Test User | | |
| Test Case ID | | |
| Test Email | | Use sandbox, NEVER production |

### External Services
| Service | Status | Configuration |
|---------|--------|---------------|
| SMTP | [ ] Ready | Mailtrap sandbox / Production |
| Database | [ ] Ready | |
| External API | [ ] Ready | |

---

## 3. Test Steps

### Step 1: [Action Name]

**Action:** [What the tester does]

**Expected Result:** [What should happen]

**Actual Result:**
- [ ] ✅ Passed
- [ ] ⚠️ Partial
- [ ] ❌ Failed

**Evidence:**
```
[API response, screenshot reference, or observation]
```

**Verification Method:**
- [ ] UI observation
- [ ] API response check
- [ ] Database query
- [ ] **Actual delivery verification** (not just API success)
- [ ] Log inspection

**Notes:** [Any observations]

---

### Step 2: [Action Name]

**Action:** [What the tester does]

**Expected Result:** [What should happen]

**Actual Result:**
- [ ] ✅ Passed
- [ ] ⚠️ Partial
- [ ] ❌ Failed

**Evidence:**
```
[API response, screenshot reference, or observation]
```

**Verification Method:**
- [ ] UI observation
- [ ] API response check
- [ ] Database query
- [ ] **Actual delivery verification**
- [ ] Log inspection

**Notes:** [Any observations]

---

### Step N: [Repeat as needed]

---

## 4. Verification Summary

### API Response vs Actual Outcome

| Step | API Response | Actual Verified Outcome | Match? |
|------|--------------|------------------------|--------|
| Step 1 | [Success/Error] | [Actually happened?] | ✅/❌ |
| Step 2 | [Success/Error] | [Actually happened?] | ✅/❌ |

### Critical Verification Points

For each integration point, document BOTH the API response AND the verified outcome:

#### Email Delivery
| Metric | Value |
|--------|-------|
| SMTP Response | `[250 OK / Error]` |
| Email in Sent Folder | `[Yes/No]` |
| Email Received by Recipient | `[Yes/No - VERIFIED]` |
| Attachments Present | `[Yes/No]` |
| **Conclusion** | `[✅ Delivered / ⚠️ False Positive / ❌ Failed]` |

#### Database State
| Table | Expected | Actual | Match? |
|-------|----------|--------|--------|
| | | | |

#### External Service Calls
| Service | Request Sent | Response Received | Side Effect Verified |
|---------|--------------|-------------------|---------------------|
| | | | |

---

## 5. Issues Found

### Critical Issues (Blocking)

| ID | Description | Severity | Status | Assigned |
|----|-------------|----------|--------|----------|
| CRIT-001 | | **CRITICAL** | Open | |

### High Priority Issues

| ID | Description | Severity | Status | Assigned |
|----|-------------|----------|--------|----------|
| HIGH-001 | | High | Open | |

### Medium Priority Issues

| ID | Description | Severity | Status | Assigned |
|----|-------------|----------|--------|----------|
| MED-001 | | Medium | Open | |

### Low Priority / Cosmetic Issues

| ID | Description | Severity | Status | Assigned |
|----|-------------|----------|--------|----------|
| LOW-001 | | Low | Open | |

---

## 6. Issue Details

### [ISSUE-ID]: [Short Title]

**Severity:** Critical / High / Medium / Low

**Description:** [Detailed description of the issue]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:** [What should happen]

**Actual Behavior:** [What actually happens]

**Evidence:**
```
[Error message, API response, screenshot reference]
```

**Root Cause (if known):** [Technical explanation]

**Suggested Fix:** [If known]

---

## 7. Test Results Summary

| Metric | Value |
|--------|-------|
| Total Steps | |
| Passed | |
| Failed | |
| Partial | |
| **Pass Rate** | **X%** |

### Overall Status

- [ ] ✅ **PASSED** - All critical functionality working
- [ ] ⚠️ **PARTIAL** - Core functionality works, minor issues found
- [ ] ❌ **FAILED** - Critical issues blocking functionality

### Recommendation

- [ ] Ready for production
- [ ] Ready with known issues documented
- [ ] Needs fixes before production
- [ ] Requires re-test after fixes

---

## 8. Follow-up Actions

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| | | | |

---

## 9. Appendix

### A. Screenshots

[Reference any screenshots taken during testing]

### B. API Responses

<details>
<summary>Click to expand full API responses</summary>

```json
{
  "example": "response"
}
```

</details>

### C. Database Queries Used

```sql
-- Query to verify [what]
SELECT * FROM table WHERE condition;
```

### D. Environment Configuration

```
KEY=value
```

---

*Test journey completed: YYYY-MM-DD HH:MM*
*Document version: 1.0*
