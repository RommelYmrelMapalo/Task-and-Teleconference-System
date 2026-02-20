from website import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
    
    print("DB URI:", app.config["SQLALCHEMY_DATABASE_URI"])