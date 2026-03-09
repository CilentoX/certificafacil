FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    freetype-dev \
    icu-dev \
    oniguruma-dev \
    libzip-dev \
    zip \
    unzip \
    # Fonts for certificate generation
    font-dejavu \
    font-noto \
    ttf-liberation \
    fontconfig

# Configure and install PHP extensions
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-install -j$(nproc) \
        gd \
        pdo \
        pdo_mysql \
        intl \
        mbstring \
        zip \
        opcache

# PHP production config
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Custom PHP config
COPY docker/php.ini /usr/local/etc/php/conf.d/custom.ini

# PHP-FPM pool config (clear_env = no to pass env vars)
COPY docker/www.conf /usr/local/etc/php-fpm.d/www.conf

# Nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/http.d/default.conf

# Supervisor config
COPY docker/supervisord.conf /etc/supervisord.conf

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . .

# Remove files that should not be in production
RUN rm -f _temp_admin.php debug_generate.log _output.txt start_php.bat \
    && rm -rf .git

# Create required directories
RUN mkdir -p /var/www/html/uploads \
    /var/www/html/assets/templates \
    /var/www/html/assets/fonts \
    /var/www/html/assets/images \
    /var/www/html/assets/configs \
    /var/log/supervisor \
    /run/nginx

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 /var/www/html/uploads \
    && chmod -R 775 /var/www/html/assets/templates \
    && chmod -R 775 /var/www/html/assets/fonts \
    && chmod -R 775 /var/www/html/assets/images \
    && chmod -R 775 /var/www/html/assets/configs

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/api/templates || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
