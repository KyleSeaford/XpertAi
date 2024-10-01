// Function to auto-resize the textarea
function autoResizeTextarea() {
    this.style.height = 'auto'; // Reset the height to auto to calculate the new height
    this.style.height = (this.scrollHeight) + 'px'; // Set the height to the scrollHeight
}

// Get the textarea element
const textarea = document.getElementById('user-input');
const form = document.getElementById('chat-form');

// Add event listener for input event to auto-resize
textarea.addEventListener('input', autoResizeTextarea);

// Handle keydown event for Enter and Shift + Enter
textarea.addEventListener('keydown', function(event) {
    if (event.key === "Enter") {
        if (!event.shiftKey) {
            event.preventDefault();
            handleFormSubmit();
        }
    }
});

function handleFormSubmit() {
    if (textarea.value.trim() === '') {
        return;
    }
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

let conversationId = "";

form.addEventListener('submit', async function(event) {
    event.preventDefault();
    const userInput = textarea.value;
    const messagesDiv = document.getElementById('messages');
    const loadingIcon = document.getElementById('loading');

    // Display user message
    messagesDiv.innerHTML += `
        <div class="message user-message">
            <div class="message-text"><strong>You:</strong> ${userInput.replace(/\n/g, '<br>')}</div>
            <img src="/static/user.png" alt="User" class="user-icon">
        </div>`;

    textarea.value = '';
    autoResizeTextarea.call(textarea);

    // Show loading icon
    loadingIcon.classList.remove('hidden');

    try {
        // Get CSRF token from cookies
        const csrftoken = getCookie('csrftoken');

        // Make the request to your Django server
        const response = await fetch('/chat-api/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrftoken,  // Include the CSRF token
            },
            body: new URLSearchParams({
                message: userInput,
                conversation_id: conversationId,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error: ${errorText}`);
        }

        const jsonResponse = await response.json();
        const message_id = jsonResponse.message_id;
        conversationId = jsonResponse.conversation_id;
        const answer = jsonResponse.answer;

        if (!answer) {
            throw new Error('No answer received from the API.');
        }

        loadingIcon.classList.add('hidden');
        createNewResponseBubble(messagesDiv, answer, message_id);
    } catch (error) {
        console.error('Error:', error);
        loadingIcon.classList.add('hidden');
        messagesDiv.innerHTML += `
            <div class="message ai-message">
                <img src="/static/logoclear.png" alt="AI" class="ai-icon">
                <div class="message-text"><strong>XpertAI:</strong> Sorry, there was an error processing your request. ${error.message}</div>
            </div>`;
    }
});


function createNewResponseBubble(messagesDiv, text, messageId) {
    let messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'ai-message');
    const uniqueId = `ai-response-text-${Date.now()}`;
    messageDiv.innerHTML = `
        <img src="/static/logoclear.png" alt="AI" class="ai-icon">
        <div class="message-text"><strong>XpertAI:</strong> <md id="${uniqueId}"></md>`;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.innerHTML += `
        <div class="feedback-buttons" style="margin-top: 0; display: flex; margin-left: 51px;">
            <button class="btn btn-sm btn-outline-success" onclick="handleFeedback('like', '${messageId}')" style="margin-right: 5px;">Good</button>
            <button class="btn btn-sm btn-outline-danger" onclick="handleFeedback('dislike', '${messageId}')">Bad</button>
        </div>
        `;
    streamResponse(text, document.getElementById(uniqueId), messageDiv.querySelector('.feedback-buttons'));
}

function streamResponse(text, aiResponseTextElement, feedbackButtons) {
    let index = 0;

    function showNextCharacter() {
        if (index < text.length) {
            aiResponseTextElement.innerHTML += text.charAt(index);
            index++;
            setTimeout(showNextCharacter, 0.5);
        } else {
	    renderMarkdown();
            const messagesDiv = document.getElementById('messages');
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            if(feedbackButtons != null) {
                feedbackButtons.style.display = 'flex'; // Show the feedback buttons after streaming finishes
            }
        }
    }

    showNextCharacter();
}

// Function to get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Feedback handling function
function handleFeedback(feedbackType, messageId) {
    const messagesDiv = document.getElementById('messages');
    
    const userMessages = Array.from(messagesDiv.children).filter(child => 
        child.classList.contains('user-message')
    );

    if (userMessages.length === 0) {
        console.error('No user messages found');
        return;
    }

    const lastUserMessageElement = userMessages[userMessages.length - 1];
    const userMessageElement = lastUserMessageElement.querySelector('.message-text strong');
    
    if (!userMessageElement) {
        console.error('No message text found in the last user message element');
        return;
    }

    const userMessage = userMessageElement.textContent;

    const feedbackData = {
        feedback: feedbackType,
        userMessage: userMessage,
        messageId
    };

    fetch('/feedback-api/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(feedbackData),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Feedback submitted successfully:', data);
    })
    .catch(error => {
        console.error('Error submitting feedback:', error);
    });
}
