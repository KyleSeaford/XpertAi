echo "Installing requirements"
pip install -r requirements.txt || exit 1
echo "Running migrations"
python manage.py migrate || exit 1
echo "Collecting static files"
python manage.py collectstatic --noinput || exit 1
