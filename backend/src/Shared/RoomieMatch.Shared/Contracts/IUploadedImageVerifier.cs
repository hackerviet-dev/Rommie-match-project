namespace RoomieMatch.Shared.Contracts;

// What an uploaded image is for. Each purpose lands in its own folder per uploader, so a URL
// tells who uploaded it and why.
public enum ImagePurpose
{
    Avatar,
    Chat,
    // CCCD/CMND photos and selfie for identity verification; only the uploader and staff see the URLs.
    Verification
}

// Implemented by the Media module. Other modules check that an image URL a client sends back
// is one this member uploaded through RoomieMatch, instead of accepting any link.
public interface IUploadedImageVerifier
{
    bool IsUploadedBy(string url, Guid userId, ImagePurpose purpose);
}
