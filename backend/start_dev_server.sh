source env/bin/activate
env=DEVELOPMENT gunicorn --bind 0.0.0.0:5000 wsgi:app --timeout 0 