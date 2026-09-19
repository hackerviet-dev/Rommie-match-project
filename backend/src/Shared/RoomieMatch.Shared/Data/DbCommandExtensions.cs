using System.Data.Common;

namespace RoomieMatch.Shared.Data;

public static class DbCommandExtensions
{
    public static DbCommand AddParameter(this DbCommand command, string name, object? value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value ?? DBNull.Value;
        command.Parameters.Add(parameter);
        return command;
    }
}
