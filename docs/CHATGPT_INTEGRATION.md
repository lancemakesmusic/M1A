# ChatGPT Integration for M1A Assistant

## Overview
The M1A chat assistant now uses ChatGPT (OpenAI GPT-4o-mini) for in-depth, conversational responses while maintaining all navigation and action capabilities.

## Architecture

### Backend (`autoposter-backend/api/main.py`)
- **Endpoint**: `POST /api/chat`
- **Purpose**: Generates AI-powered chat responses using OpenAI API
- **Features**:
  - Uses conversation history for context
  - Includes system prompts with user persona and screen context
  - Automatically detects navigation intents
  - Falls back gracefully if AI is not configured

### Frontend Services

#### `services/ChatGPTService.js`
- Handles communication with the backend chat API
- Builds context-aware system prompts
- Manages conversation history
- Provides fallback responses on errors

#### `services/M1AAssistantService.js` (Updated)
- **Hybrid Approach**:
  - Fast navigation: Uses rule-based detection for immediate navigation
  - In-depth responses: Uses ChatGPT for detailed, conversational answers
  - Fallback: Uses original rule-based logic if ChatGPT fails

#### `contexts/M1AAssistantContext.js` (Updated)
- Now passes chat history to AI service for context
- Handles async AI responses
- Maintains all existing navigation and action capabilities

## Features

### ✅ What's Enhanced
1. **In-Depth Responses**: ChatGPT provides detailed, contextual answers
2. **Conversation Context**: Remembers last 10 messages for better continuity
3. **Persona Awareness**: Tailors responses based on user persona (Guest, Artist, Vendor, etc.)
4. **Screen Context**: Understands what screen user is on for relevant responses
5. **Navigation Detection**: AI can detect when users want to navigate and suggest actions

### ✅ What's Preserved
1. **Fast Navigation**: Direct navigation requests are handled instantly (rule-based)
2. **Action Capabilities**: All existing navigation and purchase flow guidance
3. **Fallback Safety**: If AI fails, falls back to reliable rule-based responses
4. **Error Handling**: Graceful degradation if API is unavailable

## Configuration

### Backend Setup
1. Add OpenAI API key to `.env`:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

2. The endpoint will automatically:
   - Use AI if key is configured
   - Fall back to helpful messages if not configured
   - Handle errors gracefully

### Frontend Setup
1. Ensure `EXPO_PUBLIC_API_BASE_URL` is set in `.env`
2. The `ChatGPTService` will automatically use the configured API base URL

## Usage

The chat now works seamlessly:
- **User**: "How do I create an event?"
- **AI**: Provides detailed, step-by-step explanation with context
- **User**: "Take me to the menu"
- **AI**: Instantly navigates (fast rule-based) + confirms with message

## Response Quality

### Before (Rule-Based)
- Short, template responses
- Limited context understanding
- Basic keyword matching

### After (ChatGPT-Powered)
- Detailed, conversational responses
- Understands context and intent
- Provides comprehensive explanations
- Maintains conversation flow
- Still handles navigation instantly

## Cost Considerations

- **Model**: GPT-4o-mini (cost-effective)
- **Max Tokens**: 500 per response (balanced quality/cost)
- **Temperature**: 0.7 (balanced creativity/consistency)
- **Context**: Last 10 messages (efficient token usage)

## Error Handling

1. **API Unavailable**: Falls back to rule-based responses
2. **Network Error**: Shows helpful message with suggestions
3. **Invalid Response**: Uses fallback logic
4. **No API Key**: Provides helpful message explaining AI features need configuration

## Testing

To test the integration:
1. Ensure backend is running with `OPENAI_API_KEY` set
2. Open M1A chat in the app
3. Ask complex questions that require detailed responses
4. Verify navigation still works instantly
5. Check that conversation context is maintained

## Future Enhancements

- Stream responses for better UX
- Add function calling for direct actions
- Implement response caching for common queries
- Add analytics for response quality

