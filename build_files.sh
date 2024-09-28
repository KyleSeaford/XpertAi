echo "Installing requirements"
pip install -r requirements.txt
echo "Running migrations"
python3.9 manage.py migrate
echo "Collecting static files"
python3.9 manage.py collectstatic --noinput
