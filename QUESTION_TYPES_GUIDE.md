# Question Types Configuration Guide

The skills assessment now supports multiple question types to make the assessment more engaging and comprehensive.

## Available Question Types

### 1. **Rating Questions** (Default)
- Users rate their proficiency on a 1-5 scale
- Labels: Novice, Beginner, Intermediate, Advanced, Expert
- Best for: General skill proficiency assessment

### 2. **Multiple Choice Questions**
- Users select from predefined options
- Best for: Experience level, comfort level, or preference questions

### 3. **Experience-Based Questions**
- Questions about years of experience or frequency of use
- Best for: Quantifying practical experience

### 4. **Scenario-Based Questions**
- Situational questions about how users would handle specific situations
- Best for: Behavioral assessment and problem-solving approaches

## Customizing Question Types

### Configuration Location

Edit the `QUESTION_TYPE_CONFIG` object in `script.js` (around line 462):

```javascript
const QUESTION_TYPE_CONFIG = {
    enabled: ['rating', 'multiple-choice', 'experience', 'scenario'],
    distribution: {
        'rating': 0.4,        // 40% rating questions
        'multiple-choice': 0.3, // 30% multiple choice
        'experience': 0.2,     // 20% experience-based
        'scenario': 0.1        // 10% scenario-based
    }
};
```

### How to Customize

1. **Enable/Disable Question Types**
   - Add or remove types from the `enabled` array
   - Example: `enabled: ['rating', 'multiple-choice']` (only uses these two types)

2. **Adjust Distribution**
   - Change the percentages in the `distribution` object
   - Percentages should add up to approximately 1.0 (100%)
   - Example: To make it 50% rating, 50% multiple choice:
     ```javascript
     distribution: {
         'rating': 0.5,
         'multiple-choice': 0.5
     }
     ```

3. **Customize Question Text**
   - Edit the question generation functions:
     - `generateQuestionsFromSkills()` - for O*NET-generated questions
     - `generateFallbackQuestions()` - for fallback questions

## Example Configurations

### All Rating Questions
```javascript
const QUESTION_TYPE_CONFIG = {
    enabled: ['rating'],
    distribution: {
        'rating': 1.0
    }
};
```

### Mix of Rating and Multiple Choice
```javascript
const QUESTION_TYPE_CONFIG = {
    enabled: ['rating', 'multiple-choice'],
    distribution: {
        'rating': 0.6,
        'multiple-choice': 0.4
    }
};
```

### More Scenario-Based Questions
```javascript
const QUESTION_TYPE_CONFIG = {
    enabled: ['rating', 'scenario', 'experience'],
    distribution: {
        'rating': 0.3,
        'scenario': 0.4,
        'experience': 0.3
    }
};
```

## Adding Custom Question Types

To add a new question type:

1. **Add to enabled array**:
   ```javascript
   enabled: ['rating', 'multiple-choice', 'experience', 'scenario', 'your-new-type']
   ```

2. **Add distribution**:
   ```javascript
   distribution: {
       'your-new-type': 0.2
   }
   ```

3. **Add generation logic** in `generateQuestionsFromSkills()`:
   ```javascript
   else if (questionType === 'your-new-type') {
       generatedQuestions.push({
           id: questionId++,
           category: category,
           type: 'multiple-choice', // or 'rating'
           question: `Your custom question about ${skill.name}`,
           // ... rest of question structure
       });
   }
   ```

4. **Add display logic** in `showQuestion()` if needed (most custom types can use existing 'multiple-choice' or 'rating' display)

## Question Type Examples

### Rating Question
```javascript
{
    type: 'rating',
    question: "Rate your proficiency in JavaScript",
    scale: {
        min: 1,
        max: 5,
        labels: ["Novice", "Beginner", "Intermediate", "Advanced", "Expert"]
    }
}
```

### Multiple Choice Question
```javascript
{
    type: 'multiple-choice',
    question: "How would you describe your experience with React?",
    options: [
        { text: "No experience", value: 1 },
        { text: "Limited experience", value: 2 },
        { text: "Moderate experience", value: 3 },
        { text: "Extensive experience", value: 4 }
    ]
}
```

## Tips

- **Balance variety**: Mix different question types to keep users engaged
- **Match to skill**: Use scenario questions for problem-solving skills, experience questions for technical skills
- **Test your changes**: After modifying question types, test the assessment to ensure questions display correctly
- **Scoring consistency**: All question types should map to values 1-4 for consistent scoring

