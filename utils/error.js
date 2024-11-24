export const errorMiddleware = (err, req, res, next) => {
    const statusCode = err.statusCode || 500; // Default to 500 if no status code is set
    const message = err.message || 'Internal Server Error';
    

    
    res.status(statusCode).json({
        success: false,
        error: {
            message: message,
            statusCode: statusCode
        }
    });
};


