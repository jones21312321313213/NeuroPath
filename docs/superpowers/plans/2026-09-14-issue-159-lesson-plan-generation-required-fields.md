# Lesson Plan Generation Validation and Data Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 400 Bad Request error `{"subject": ["This field is required."], "topic": ["This field is required."]}` when generating a lesson plan from an IEP goal by making `subject` and `topic` optional with fallback derivation in `LessonGenerationSerializer`, aligning frontend request payload and saving logic, and verifying end-to-end compatibility.

**Architecture:** Update `LessonGenerationSerializer` in `neuropath-backend/resources/serializers.py` to make `subject` and `topic` optional, accept `goalArea`, `studentID`, and `teacherPrompt`, derive missing fields from `IEPGoal`, and validate `goalID`. Update frontend `lessonPlansAPI` in `client.js` with `save` method, update `ManageLessonPlans.jsx` to pass `subject`/`topic` and handle nested `lesson_plans` structure, and add comprehensive backend and frontend unit tests.

**Tech Stack:** Django REST Framework, Python 3.12+, React 18, Vitest.

## Global Constraints
- Target Issue: #159 (`[BE/FE] [BUG]: Fix 'this field is required' error when generating a Lesson Plan`)
- Must maintain backward compatibility with existing endpoints and serializers
- Must preserve existing model relationships (`IEPGoal`, `IEPModel`, `StudentProfile`, `Teacher`)
- Must pass all existing and new backend Django tests and frontend Vitest tests
- PR must conform strictly to `.github/pull_request_template.md` and pass `.github/workflows/pr-template-lint.yml`

---

### Task 1: Backend Serializer & View Alignment (Issue #159)

**Files:**
- Modify: `neuropath-backend/resources/serializers.py:37-51`
- Modify: `neuropath-backend/resources/tests/test_instructional_ai.py`

**Interfaces:**
- Consumes: `request.data` with `{ goalID, studentID, goalArea, teacherPrompt }`
- Produces: Validated serializer data with `goalID`, optional `subject`, `topic`, `goalArea`, `studentID`, `teacherPrompt`

- [ ] **Step 1: Write failing tests for `LessonGenerationSerializer` and `GenerateLessonPlanAPIView`**

Add tests to `neuropath-backend/resources/tests/test_instructional_ai.py`:
```python
    def test_lesson_generation_serializer_with_only_goal_id_and_frontend_payload(self):
        from resources.serializers import LessonGenerationSerializer
        # Payload sent by ManageLessonPlans.jsx
        payload = {
            'studentID': self.student.pk,
            'goalID': self.goal.pk,
            'goalArea': 'Behavioral Skills',
            'teacherPrompt': ''
        }
        serializer = LessonGenerationSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['goalID'], self.goal.pk)
        # Should derive subject from goalArea or IEPGoal subject_category
        self.assertEqual(serializer.validated_data['subject'], 'Behavioral Skills')
        # Should derive topic from IEPGoal annual_goal
        self.assertEqual(serializer.validated_data['topic'], self.goal.annual_goal)

    def test_lesson_generation_serializer_invalid_goal_id(self):
        from resources.serializers import LessonGenerationSerializer
        serializer = LessonGenerationSerializer(data={'goalID': 0})
        self.assertFalse(serializer.is_valid())
        self.assertIn('goalID', serializer.errors)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_lesson_plan_api_view_post_success_with_frontend_payload(self, mock_ai):
        from rest_framework.test import APIClient
        from rest_framework.authtoken.models import Token
        mock_ai.return_value = ('{"lesson_plans": [{"objective_focus": "Focus", "introduction": "Intro", "core_activity": "Activity", "assessment": "Check", "materials_needed": ["Item"]}]}', 'template_fallback')
        
        token, _ = Token.objects.get_or_create(user=self.teacher.user if hasattr(self.teacher, 'user') and self.teacher.user else None)
        # If teacher has no user, ensure proper auth via login
        client = APIClient()
        # Authenticate with teacher credentials
        from django.contrib.auth.models import User
        user, _ = User.objects.get_or_create(username='test_teacher_bob', email='bob@test.com')
        self.teacher.user = user
        self.teacher.save()
        token, _ = Token.objects.get_or_create(user=user)
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        payload = {
            'studentID': self.student.pk,
            'goalID': self.goal.pk,
            'goalArea': 'Behavioral Skills',
            'teacherPrompt': ''
        }
        response = client.post('/api/resources/generate-lesson/', payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('data', response.data)
        self.assertIn('lesson_plans', response.data['data'])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="test.sqlite3"; python manage.py test resources.tests.test_instructional_ai`
Expected: FAIL with `{'subject': [ErrorDetail(string='This field is required.', code='required')], 'topic': [ErrorDetail(string='This field is required.', code='required')]}`

- [ ] **Step 3: Update `LessonGenerationSerializer` in `neuropath-backend/resources/serializers.py`**

```python
class LessonGenerationSerializer(serializers.Serializer):
    # 🚀 REWIRED: Streamlined for IEP Goal generation while retaining backward-compatibility
    goalID = serializers.IntegerField(required=True)
    subject = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    topic = serializers.CharField(required=False, allow_blank=True, default="")
    
    gradeLevel = serializers.CharField(max_length=50, required=False, allow_blank=True)
    specificGoals = serializers.CharField(required=False, allow_blank=True)
    goalArea = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    teacherPrompt = serializers.CharField(required=False, allow_blank=True, default="")
    studentID = serializers.IntegerField(required=False)

    def validate_goalID(self, value):
        if value <= 0:
            raise serializers.ValidationError("IEP Goal ID must be a valid positive integer.")
        return value

    def validate_topic(self, value):
        if value and len(value.strip()) < 3:
            raise serializers.ValidationError("Topic description must be more specific.")
        return value

    def validate(self, attrs):
        # Derive subject/topic from goalArea or IEPGoal if omitted
        goal_id = attrs.get('goalID')
        if not attrs.get('subject') or not attrs.get('topic'):
            if goal_id:
                try:
                    from iep_management.models import IEPGoal
                    goal = IEPGoal.objects.select_related('iep').get(pk=goal_id)
                    if not attrs.get('subject'):
                        attrs['subject'] = attrs.get('goalArea') or getattr(goal, 'subject_category', None) or 'General'
                    if not attrs.get('topic'):
                        attrs['topic'] = (
                            getattr(goal, 'annual_goal', None)
                            or getattr(goal, 'goalName', None)
                            or attrs.get('goalArea')
                            or 'IEP Goal'
                        )
                except Exception:
                    if not attrs.get('subject'):
                        attrs['subject'] = attrs.get('goalArea') or 'General'
                    if not attrs.get('topic'):
                        attrs['topic'] = attrs.get('goalArea') or 'IEP Goal'
        return attrs
```

- [ ] **Step 4: Run test to verify it passes**

Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="test.sqlite3"; python manage.py test resources.tests.test_instructional_ai`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/resources/serializers.py neuropath-backend/resources/tests/test_instructional_ai.py
git commit -m "fix(backend): make subject and topic optional and derive defaults in LessonGenerationSerializer (#159)"
```

---

### Task 2: Frontend Client & Lesson Plan Saving Logic

**Files:**
- Modify: `neuropath-frontend/src/api/client.js:108-130`
- Modify: `neuropath-frontend/src/api/client.test.js`
- Modify: `neuropath-frontend/src/pages/ManageLessonPlans.jsx:330-360`

**Interfaces:**
- Consumes: `lessonPlansAPI.generate(payload)`, `lessonPlansAPI.save(payload)`
- Produces: API response and updated component state

- [ ] **Step 1: Write the failing tests in `client.test.js`**

Add tests to `neuropath-frontend/src/api/client.test.js`:
```javascript
  it("generates a lesson plan with provided parameters", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ message: "Generated", data: { lesson_plans: [] } }));
    const payload = { studentID: 1, goalID: 10, goalArea: "Math", teacherPrompt: "" };
    const result = await lessonPlansAPI.generate(payload);
    expect(result).toEqual({ message: "Generated", data: { lesson_plans: [] } });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/resources/generate-lesson/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("saves a generated lesson plan with transformed payload", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ lessonID: 42, title: "Math Lesson Plan" }));
    const payload = {
      studentID: 1,
      goalID: 10,
      title: "Math Lesson Plan",
      content: [{ objective_focus: "Counting" }],
    };
    const result = await lessonPlansAPI.save(payload);
    expect(result).toEqual({ lessonID: 42, title: "Math Lesson Plan" });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/resources/lesson-plans/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          iep_goal: 10,
          title: "Math Lesson Plan",
          lessonContent: JSON.stringify([{ objective_focus: "Counting" }]),
        }),
      }),
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api/client.test.js`
Expected: FAIL (`lessonPlansAPI.generate is not a function` / `lessonPlansAPI.save is not a function` because `lessonPlansAPI` is not imported or `save` is missing)

- [ ] **Step 3: Update `client.js` and `ManageLessonPlans.jsx`**

In `neuropath-frontend/src/api/client.js`:
Add `save` to `lessonPlansAPI`:
```javascript
export const lessonPlansAPI = {
  getDirectory: (teacherId) =>
    request(
      `/resources/generate-lesson/${teacherId ? `?teacher_id=${teacherId}` : ""}`,
    ),
  generate: (payload) =>
    request("/resources/generate-lesson/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  save: (payload) =>
    request("/resources/lesson-plans/", {
      method: "POST",
      body: JSON.stringify({
        iep_goal: payload.goalID || payload.iep_goal,
        title: payload.title,
        lessonContent:
          typeof payload.content === "object"
            ? JSON.stringify(payload.content)
            : payload.content || payload.lessonContent,
      }),
    }),
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/resources/view-lessons/${qs ? "?" + qs : ""}`);
  },
  get: (id) => request(`/resources/edit-lesson/${id}/`),
  update: (id, payload) =>
    request(`/resources/edit-lesson/${id}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  delete: (id) =>
    request(`/resources/delete-lesson/${id}/`, { method: "DELETE" }),
};
```

In `neuropath-frontend/src/pages/ManageLessonPlans.jsx`:
Update `handleGenerate` to pass `subject` and `topic` defensively, and update `handleSave` to support both `generated.lesson_plans` and `generated.data?.lesson_plans`:
```javascript
  const handleGenerate = async () => {
    if (!selectedStudent || !selectedGoal) return;
    setLoading(true);
    setError("");
    setGenerated(null);
    setSaved(false);

    try {
      const res = await lessonPlansAPI.generate({
        studentID: selectedStudent.studentID,
        goalID: selectedGoal.goalID,
        goalArea: selectedGoal.goalArea,
        subject: selectedGoal.goalArea || "General",
        topic: selectedGoal.label || selectedGoal.goalArea || "IEP Goal",
        teacherPrompt: "",
      });
      setGenerated(res);
    } catch (err) {
      setError(err.message || "Failed to generate lesson plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const plans = generated?.lesson_plans || generated?.data?.lesson_plans;
    if (!plans || !selectedStudent) return;
    setLoading(true);
    setError("");

    try {
      const savedPlan = await lessonPlansAPI.save({
        studentID: selectedStudent.studentID,
        goalID: selectedGoal?.goalID || null,
        title: `${selectedGoal?.goalArea || "ASD"} Lesson Plan`,
        content: plans,
      });
      setSaved(true);
      onSave(savedPlan);
    } catch (err) {
      setError(err.message || "Failed to save lesson plan.");
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/api/client.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/api/client.js neuropath-frontend/src/api/client.test.js neuropath-frontend/src/pages/ManageLessonPlans.jsx
git commit -m "fix(frontend): provide save method on lessonPlansAPI and forward subject/topic in generation payload (#159)"
```

---

### Task 3: Full Test Suite Verification

- [ ] **Step 1: Run complete backend test suite**
Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="test.sqlite3"; python manage.py test resources`
Expected: 35+ tests pass with code 0.

- [ ] **Step 2: Run complete frontend test suite**
Run: `npx vitest run`
Expected: 34 test files (269+ tests) pass with code 0.

---

### Task 4: Push Branch and Create Pull Request

- [ ] **Step 1: Push changes to remote**
Run: `git push -u origin Pakibabes/be-fe-bug-fix-this-field-is-required-error-when`

- [ ] **Step 2: Create Pull Request with compliant template**
Run: `gh pr create --base development --head Pakibabes/be-fe-bug-fix-this-field-is-required-error-when --title "fix: resolve 'this field is required' validation error when generating lesson plan (#159)" --body "..."`
