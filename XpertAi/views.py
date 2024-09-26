from django.http import HttpResponse, HttpResponseRedirect
from django.template import loader
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.shortcuts import redirect, render
from django.contrib.auth import logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

import requests
import os
import logging
from dotenv import load_dotenv

from XpertAi.forms import LoginForm, SignupForm

# Logger setup for error tracking
logger = logging.getLogger(__name__)

load_dotenv()

API_KEY = os.getenv('API_KEY')

def home(request):
    if not request.user.is_authenticated:
        return redirect("Login")
    
    return render(request, 'index.html')

def login_view(request):
    if request.user.is_authenticated:
        return HttpResponseRedirect("/")
    
    if request.method == "POST":
        login_form = LoginForm(request.POST)
        if login_form.is_valid():
            authenticated_user = authenticate(request, username=login_form.cleaned_data.get("username"), password=login_form.cleaned_data.get("password"))
            if authenticated_user is not None:
                login(request=request, user=authenticated_user)
            return HttpResponseRedirect("/")


    return render(request, 'login.html')

def signout_view(request):
    logout(request)
    return HttpResponseRedirect("/") 

def signup(request):
    if request.method == "POST":
        signup_form = SignupForm(request.POST)
        if signup_form.is_valid():
            if User.objects.filter(username = signup_form.cleaned_data.get("username")).first():
                return render(request, 'signup.html')
            

            user = User.objects.create_user(signup_form.cleaned_data.get("username"), password=signup_form.cleaned_data.get("password"))

            authenticated_user = authenticate(request, username=signup_form.cleaned_data.get("username"), password=signup_form.cleaned_data.get("password"))
            if authenticated_user is not None:
                login(request=request, user=authenticated_user)
            return HttpResponseRedirect("/")

    return render(request, 'signup.html')


@csrf_exempt
@login_required  # Ensure the user is logged in
def chat_api(request):
    if request.method == 'POST':
        user_message = request.POST.get('message')
        conversation_id = request.POST.get('conversation_id', '')
        user = request.user  # Get the logged-in user

        # Validate user input
        if not user_message:
            return JsonResponse({'error': 'Message cannot be empty'}, status=400)

        headers = {
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json',
        }

        data = {
            "inputs": {},
            "query": user_message,
            "response_mode": "blocking",
            "conversation_id": conversation_id,
            "user": user.username,  # Use the logged-in user's username
            "files": []
        }

        try:
            response = requests.post('https://api.dify.ai/v1/chat-messages', headers=headers, json=data)
            response.raise_for_status()  # Raise an error for bad responses
            response_data = response.json()
            return JsonResponse(response_data, status=200)

        except requests.HTTPError as e:
            logger.error(f"HTTPError: {e.response.status_code}, {e.response.text}")
            return JsonResponse({'error': 'API request failed: ' + e.response.text}, status=e.response.status_code)

        except requests.RequestException as e:
            logger.error(f"RequestException: {str(e)}")
            return JsonResponse({'error': 'Server Error: Unable to process the request.'}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)
