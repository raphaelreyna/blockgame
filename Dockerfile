FROM nginx:1.25-alpine

# Copy built assets into nginx html directory
COPY dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
