from django.http import HttpResponse, HttpResponseRedirect
from django.template import loader
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
# chatbot/views.py
from django.shortcuts import redirect, render
from django.contrib.auth import logout

import requests
import os
from dotenv import load_dotenv
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from XpertAi.forms import LoginForm, SignupForm

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
def chat_api(request):
    if request.method == 'POST':
        user_message = request.POST.get('message')
        conversation_id = request.POST.get('conversation_id', '')

        # Make the API request to the external service (e.g., Dify API)
        headers = {
            'Content-Type': 'application/json',
            'Authorization': API_KEY,  # Your API key (keep this secret!)
        }
        data = {
            "inputs": {},
            "query": user_message,
            "response_mode": "blocking",
            "conversation_id": conversation_id,
            "user": "XpertAI_Devs",
            "files": []
        }

        try:
            response = requests.post('https://api.dify.ai/v1/chat-messages', headers=headers, json=data)
            response.raise_for_status()  # Raise an error for bad responses
            response_data = response.json()
            return JsonResponse(response_data, status=200)
        except requests.RequestException as e:
            return JsonResponse({'error': str(e)}, status=500)