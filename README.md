# Skills Assessment Application

A modern, interactive web-based skills assessment tool that evaluates skills based on your selected role using O*NET (Occupational Information Network) data. The application dynamically generates role-specific questions based on the skills required for your occupation.

## Features

- ✨ Beautiful, modern UI with gradient design
- 🎯 **Role-based assessment** - Select your occupation to get tailored questions
- 🔗 **O*NET Integration** - Uses official O*NET data to identify required skills
- 📊 Multiple question types (multiple choice and rating scales)
- 🔍 Role search functionality
- 📈 Real-time progress tracking
- 🎯 Category-based scoring
- 📋 Detailed results breakdown
- 📱 Responsive design for mobile and desktop

## How to Use

1. **Open the Application**
   - Open `index.html` in your web browser
   - **Note:** Due to CORS restrictions with O*NET API, you may need to run a local server (see Setup section)

2. **Select Your Role**
   - Click "Get Started" on the welcome screen
   - Browse or search for your occupation from the list
   - Click on your role to begin the assessment
   - The app will fetch skills data from O*NET for your selected role

3. **Take the Assessment**
   - Answer questions about your proficiency in role-specific skills
   - Questions are dynamically generated based on O*NET skill data
   - Use the "Previous" and "Next" buttons to navigate
   - Progress bar shows your completion status

4. **View Results**
   - After answering all questions, click "Submit Assessment"
   - View your overall score and category breakdowns
   - See how well you perform the skills required for your role

## O*NET Integration

This application integrates with the O*NET (Occupational Information Network) database to fetch role-specific skills. O*NET is maintained by the U.S. Department of Labor and provides comprehensive data on over 900 occupations.

### How It Works

1. **Role Selection**: Users select their occupation from a list of O*NET-coded roles
2. **Skill Fetching**: The app queries O*NET API to get skills required for that role
3. **Question Generation**: Questions are dynamically created based on the fetched skills
4. **Assessment**: Users rate their proficiency in each skill
5. **Results**: Scores are calculated and displayed by skill category

### O*NET API Setup

**Important Notes:**
- O*NET API may require registration at https://services.onetcenter.org/
- Direct API calls may fail due to CORS (Cross-Origin Resource Sharing) restrictions
- For production use, you may need to set up a proxy server

**Options:**
1. **Use a Proxy Server**: Set up a backend proxy to handle O*NET API calls
2. **Use Fallback Data**: The app includes fallback questions if O*NET API is unavailable
3. **Local Development**: Use a local server with CORS headers configured

### Question Types

**Rating Scale Questions**
Rate your skills on a 1-5 scale:
- 1: Novice
- 2: Beginner
- 3: Intermediate
- 4: Advanced
- 5: Expert

Questions are automatically generated from O*NET skill data, grouped by skill categories.

## Setup

### Running Locally

Due to CORS restrictions, you'll need to run a local server:

**Python:**
```bash
python -m http.server 8000
```

**Node.js:**
```bash
npx http-server
```

Then open `http://localhost:8000` in your browser.

### Adding More Occupations

Edit `occupations.json` to add more roles. Each occupation needs:
- `code`: O*NET SOC code (e.g., "15-1132.00")
- `title`: Occupation title
- `onet_soc_code`: Same as code

Example:
```json
{
    "code": "15-1132.00",
    "title": "Software Developers, Applications",
    "onet_soc_code": "15-1132.00"
}
```

### Customizing Fallback Questions

If O*NET API is unavailable, the app uses fallback questions. Edit the `generateFallbackQuestions()` function in `script.js` to customize these for specific roles.

## AI-Based Response Evaluation

The application now supports AI-based evaluation of open-ended responses using OpenAI's API. This provides more accurate and nuanced scoring compared to the keyword-based fallback method.

### Enabling AI Evaluation

1. **Get an OpenAI API Key**
   - Sign up at https://platform.openai.com/
   - Create an API key in your account settings

2. **Configure the Application**
   - Open `script.js`
   - Find the AI Evaluation Configuration section (around line 24-29)
   - Set `AI_EVALUATION_ENABLED = true`
   - Add your API key: `const OPENAI_API_KEY = 'your-api-key-here';`

3. **Choose a Model**
   - `gpt-4o-mini` (default): Cost-effective, good accuracy
   - `gpt-4`: Higher accuracy, more expensive

### How It Works

- **AI Evaluation**: When enabled, responses are sent to OpenAI with the scenario, question, response, and rubric. The AI returns a score (1, 2, or 3).
- **Fallback**: If AI evaluation fails or is disabled, the system uses keyword-based matching.
- **Usage**: AI evaluation is used when users click "Evaluate Response" on individual questions. Batch feedback uses keyword evaluation for performance.

### Security Note

⚠️ **Important**: Never commit your API key to version control. Consider:
- Using environment variables
- Setting up a backend proxy to handle API calls
- Using a secrets management service

### O*NET API Configuration

To use the O*NET API directly, you may need to:
1. Register at https://services.onetcenter.org/
2. Update the `ONET_API_BASE` constant in `script.js` if needed
3. Set up a proxy server to handle CORS (recommended for production)

## Files

- `index.html` - Main HTML structure
- `styles.css` - Styling and layout
- `script.js` - Assessment logic, O*NET integration, and question generation
- `occupations.json` - List of occupations with O*NET codes
- `README.md` - This file

## Browser Compatibility

Works on all modern browsers:
- Chrome
- Firefox
- Safari
- Edge

## License

Free to use and modify for your needs.

