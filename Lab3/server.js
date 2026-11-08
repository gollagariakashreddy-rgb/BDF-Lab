
const express = require('express');
const db = require('./database');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// GET all books with search, sorting and filtering
app.get('/books', (req, res) => {
    const {
        search_q = '',
        order_by = 'title',
        order = 'ASC',
        limit = '10',
        offset = '0',
        min_price,
        max_price
    } = req.query;

    // Validate sorting column
    const allowedColumns = ['id', 'title', 'author', 'price'];

    if (!allowedColumns.includes(order_by)) {
        return res.status(400).json({
            message: 'Invalid order_by column'
        });
    }

    // Validate sorting order
    const sortOrder = order.toUpperCase();

    if (!['ASC', 'DESC'].includes(sortOrder)) {
        return res.status(400).json({
            message: 'Order must be ASC or DESC'
        });
    }

    const pageLimit = Number(limit);
    const pageOffset = Number(offset);

    if (!Number.isInteger(pageLimit) || pageLimit < 1 ||
        !Number.isInteger(pageOffset) || pageOffset < 0) {
        return res.status(400).json({
            message: 'Invalid limit or offset'
        });
    }

    let sql = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    // Search by partial book title
    if (search_q.trim() !== '') {
        sql += ' AND title LIKE ?';
        params.push(`%${search_q}%`);
    }

    // Minimum price filter
    if (min_price !== undefined) {
        const min = Number(min_price);

        if (!Number.isFinite(min)) {
            return res.status(400).json({
                message: 'min_price must be numeric'
            });
        }

        sql += ' AND price >= ?';
        params.push(min);
    }

    // Maximum price filter
    if (max_price !== undefined) {
        const max = Number(max_price);

        if (!Number.isFinite(max)) {
            return res.status(400).json({
                message: 'max_price must be numeric'
            });
        }

        sql += ' AND price <= ?';
        params.push(max);
    }

    if (min_price !== undefined && max_price !== undefined &&
        Number(min_price) > Number(max_price)) {
        return res.status(400).json({
            message: 'min_price cannot exceed max_price'
        });
    }

    // Sorting and pagination
    sql += ` ORDER BY ${order_by} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(pageLimit, pageOffset);

    db.all(sql, params, (error, rows) => {
        if (error) {
            return res.status(500).json({
                message: 'Failed to retrieve books'
            });
        }

        res.status(200).json(rows);
    });
});

// GET one book by ID
app.get('/books/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM books WHERE id = ?', [id],
        (error, book) => {
            if (error) {
                return res.status(500).json({
                    message: 'Database error'
                });
            }

            if (!book) {
                return res.status(404).json({
                    message: 'Book not found'
                });
            }

            res.status(200).json(book);
        }
    );
});

// POST create a new book
app.post('/books', (req, res) => {
    const { title, author, price } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
            message: 'Title is required'
        });
    }

    if (typeof author !== 'string' || !author.trim()) {
        return res.status(400).json({
            message: 'Author is required'
        });
    }

    if (price === undefined || price === null ||
        price === '' || !Number.isFinite(Number(price))) {
        return res.status(400).json({
            message: 'Price must be a number'
        });
    }

    db.run(
        'INSERT INTO books (title, author, price) VALUES (?, ?, ?)',
        [title.trim(), author.trim(), Number(price)],
        function (error) {
            if (error) {
                return res.status(500).json({
                    message: 'Failed to add book'
                });
            }

            res.status(201).json({
                message: 'Book added successfully',
                id: this.lastID
            });
        }
    );
});

// PUT update a book
app.put('/books/:id', (req, res) => {
    const { id } = req.params;
    const { title, author, price } = req.body;

    if (typeof title !== 'string' || !title.trim() ||
        typeof author !== 'string' || !author.trim() ||
        price === undefined || price === null ||
        price === '' || !Number.isFinite(Number(price))) {
        return res.status(400).json({
            message: 'Valid title, author and numeric price are required'
        });
    }

    db.run(
        'UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?',
        [title.trim(), author.trim(), Number(price), id],
        function (error) {
            if (error) {
                return res.status(500).json({
                    message: 'Failed to update book'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: 'Book not found'
                });
            }

            res.status(200).json({
                message: 'Book updated successfully'
            });
        }
    );
});

// DELETE a book
app.delete('/books/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM books WHERE id = ?', [id],
        function (error) {
            if (error) {
                return res.status(500).json({
                    message: 'Failed to delete book'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: 'Book not found'
                });
            }

            res.status(200).json({
                message: 'Book deleted successfully'
            });
        }
    );
});

// Handle invalid JSON
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400) {
        return res.status(400).json({
            message: 'Invalid JSON request body'
        });
    }

    next(error);
});

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        message: "Server is running successfully!"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at port ${PORT}`);
});
