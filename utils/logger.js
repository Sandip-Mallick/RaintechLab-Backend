// utils/logger.js
const sensitiveKeys = ['password', 'token', 'secret', 'key', 'MONGO_URI', 'JWT_SECRET', 'email', 'creditCard', 'ssn'];

// Function to redact sensitive information
const redactSensitiveInfo = (data) => {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveInfo(item));
  }
  
  const result = { ...data };
  
  Object.keys(result).forEach(key => {
    // Check if this key contains sensitive information
    const isSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()));
    
    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else if (typeof result[key] === 'object') {
      result[key] = redactSensitiveInfo(result[key]);
    }
  });
  
  return result;
};

const logger = {
  info: (message, data) => {
    if (data) {
      console.log(`INFO: ${message}`, redactSensitiveInfo(data));
    } else {
      console.log(`INFO: ${message}`);
    }
  },
  
  error: (message, error) => {
    if (error instanceof Error) {
      console.error(`ERROR: ${message}`, {
        name: error.name,
        message: error.message,
        // Don't include stack trace in production
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      });
    } else if (error) {
      console.error(`ERROR: ${message}`, redactSensitiveInfo(error));
    } else {
      console.error(`ERROR: ${message}`);
    }
  },
  
  debug: (message, data) => {
    if (process.env.NODE_ENV !== 'production') {
      if (data) {
        console.debug(`DEBUG: ${message}`, redactSensitiveInfo(data));
      } else {
        console.debug(`DEBUG: ${message}`);
      }
    }
  },
  
  warn: (message, data) => {
    if (data) {
      console.warn(`WARN: ${message}`, redactSensitiveInfo(data));
    } else {
      console.warn(`WARN: ${message}`);
    }
  }
};

module.exports = logger; 