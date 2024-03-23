CREATE TABLE Blog_data (
    id SERIAL PRIMARY KEY,
    name varchar(50),
    title varchar(100),
    subtitle varchar(250),
    blog varchar(1000),
    image_name varchar(50),
    added_on DATE NOT NULL DEFAULT CURRENT_DATE
);


CREATE TABLE Users(
    id SERIAL PRIMARY KEY,
    name varchar(50),
    email varchar(50),
    password password(50)
)