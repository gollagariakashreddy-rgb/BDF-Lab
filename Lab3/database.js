
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'books.db');

const db = new sqlite3.Database(dbPath, (error) => {
    if (error) {
        console.error('Database connection failed:', error.message);
    } else {
        console.log('Database connected successfully');
    }
});

db.run(`
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price REAL NOT NULL
    )
`, (error) => {

    if (error) {
        console.error(error.message);
        return;
    }

    console.log('Books table created successfully');

    // Check whether books already exist
    db.get('SELECT COUNT(*) AS count FROM books', (error, row) => {

        if (error) {
            console.error(error.message);
            return;
        }

        // Insert sample books only if database is empty
        if (row.count === 0) {

            const books = [
                ['Harry Potter', 'J.K. Rowling', 500],
                ['The Alchemist', 'Paulo Coelho', 300],
                ['Wings of Fire', 'A.P.J. Abdul Kalam', 250],
                ['Atomic Habits', 'James Clear', 450],
                ['Rich Dad Poor Dad', 'Robert Kiyosaki', 350],
                ['The Great Gatsby', 'F. Scott Fitzgerald', 200],
                ['Think and Grow Rich', 'Napoleon Hill', 400],
                ['Ikigai', 'Hector Garcia', 320],
                ['The Power of Habit', 'Charles Duhigg', 380],
                ['Java Programming', 'James', 450]
            ];

            const sql = `
                INSERT INTO books (title, author, price)
                VALUES (?, ?, ?)
            `;

            const statement = db.prepare(sql);

            books.forEach((book) => {
                statement.run(book);
            });

            statement.finalize(() => {
                console.log('10 sample books inserted successfully');
            });
        } else {
            console.log('Books already exist. No sample data inserted.');
        }
    });
});

module.exports = db;
