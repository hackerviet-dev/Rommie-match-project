using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace RoomieMatch.Bootstrapper.Infrastructure;

// Record validation lives on constructor parameters. Document the actual required
// inputs rather than marking every constructor parameter (including nullable ones) required.
internal sealed class RequestRequiredFieldsTransformer : IOpenApiSchemaTransformer
{
    public Task TransformAsync(OpenApiSchema schema, OpenApiSchemaTransformerContext context,
        CancellationToken cancellationToken)
    {
        var type = context.JsonTypeInfo.Type;
        if (type.Name.EndsWith("Request", StringComparison.Ordinal) && schema.Properties is not null)
        {
            var parameters = type.GetConstructors().OrderByDescending(c => c.GetParameters().Length)
                .FirstOrDefault()?.GetParameters() ?? [];
            schema.Required = parameters.Where(p => p.IsDefined(typeof(RequiredAttribute)) || p.Name == "Status"
                    || (p.ParameterType.IsValueType && Nullable.GetUnderlyingType(p.ParameterType) is null
                        && p.GetCustomAttribute<RangeAttribute>() is { } range
                        && !range.IsValid(Activator.CreateInstance(p.ParameterType))))
                .Select(p => JsonNamingPolicy.CamelCase.ConvertName(p.Name!)).ToHashSet();
        }
        return Task.CompletedTask;
    }
}

internal sealed class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes[JwtBearerDefaults.AuthenticationScheme] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Access token tra ve tu POST /api/auth/login hoac POST /api/auth/register."
        };

        return Task.CompletedTask;
    }
}

internal sealed class AuthorizeRequirementTransformer : IOpenApiOperationTransformer
{
    public Task TransformAsync(
        OpenApiOperation operation,
        OpenApiOperationTransformerContext context,
        CancellationToken cancellationToken)
    {
        var metadata = context.Description.ActionDescriptor.EndpointMetadata;
        if (metadata.OfType<IAllowAnonymous>().Any() || !metadata.OfType<IAuthorizeData>().Any())
        {
            return Task.CompletedTask;
        }

        operation.Security =
        [
            new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference(JwtBearerDefaults.AuthenticationScheme, context.Document)] = []
            }
        ];

        operation.Responses ??= new OpenApiResponses();
        operation.Responses.TryAdd("401", new OpenApiResponse
        {
            Description = "Thiếu Bearer access token, token hết hạn hoặc phiên đã bị thu hồi."
        });
        operation.Responses.TryAdd("403", new OpenApiResponse
        {
            Description = "Đã đăng nhập nhưng không đủ quyền hoặc không thỏa điều kiện truy cập; xem mô tả endpoint."
        });

        return Task.CompletedTask;
    }
}
