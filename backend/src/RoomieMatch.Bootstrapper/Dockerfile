FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

COPY backend/src/RoomieMatch.slnx backend/src/
COPY backend/src/RoomieMatch.Bootstrapper/RoomieMatch.Bootstrapper.csproj backend/src/RoomieMatch.Bootstrapper/
COPY backend/src/Modules/Users/RoomieMatch.Modules.Users.csproj backend/src/Modules/Users/
COPY backend/src/Modules/Matching/RoomieMatch.Modules.Matching.csproj backend/src/Modules/Matching/
COPY backend/src/Modules/Hyperlocal/RoomieMatch.Modules.Hyperlocal.csproj backend/src/Modules/Hyperlocal/
COPY backend/src/Shared/RoomieMatch.Shared/RoomieMatch.Shared.csproj backend/src/Shared/RoomieMatch.Shared/
RUN dotnet restore backend/src/RoomieMatch.Bootstrapper/RoomieMatch.Bootstrapper.csproj

COPY backend/src backend/src
RUN dotnet publish backend/src/RoomieMatch.Bootstrapper/RoomieMatch.Bootstrapper.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "RoomieMatch.Bootstrapper.dll"]
