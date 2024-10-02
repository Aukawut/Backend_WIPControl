# Use official Node.js 18 base image
FROM node:20-alpine

# Set environment variabl
#Control WIP
ENV PORT=5600
ENV DB_USER=pd-wipcontrol
ENV DB_PWD=P@ssw0rd@2567**
ENV DB_NAME=PRD_WIPCONTROL
ENV DB_SERVER=PSTH-SRRYAPP04
ENV JWT_SECRET=$psthdeveloperteam@@
ENV LDAP_URL=ldap://10.144.1.6
ENV DOMAIN_NAME=PSTH.COM
ENV TOKEN_APPROVE=$wipcontrolpsthsystem@@

#Adhesive
ENV DB_NAME_APP02=DB_AVP2WIPCONTROL
ENV DB_SERVER_APP02=SRRYAPP02
ENV DB_USER_APP02=sa
ENV DB_PWD_APP02=p$th@2567

#IM
ENV DB_NAME_APP09=DCS_IM
ENV DB_SERVER_APP09=bsncrapp09
ENV DB_USER_APP09=dcs_im
ENV DB_PWD_APP09=dcsw0rd
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose port
EXPOSE $PORT

# Command to run the application
CMD ["node", "index.js"]