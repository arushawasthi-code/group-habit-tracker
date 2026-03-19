using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using HabitHive.Api.Models.Dtos;
using HabitHive.Api.Services;

namespace HabitHive.Api.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly ChatService _chatService;

    public ChatHub(ChatService chatService)
    {
        _chatService = chatService;
    }

    private Guid GetUserId() => Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public async Task JoinGroup(Guid groupId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupId.ToString());
    }

    public async Task LeaveGroup(Guid groupId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupId.ToString());
    }

    public async Task SendMessage(Guid groupId, SendMessageRequest request)
    {
        var message = await _chatService.SaveMessageAsync(groupId, GetUserId(), request);
        await Clients.Group(groupId.ToString()).SendAsync("ReceiveMessage", message);
    }

    public async Task SendSpecialMessage(Guid groupId, SendSpecialMessageRequest request)
    {
        var message = await _chatService.SaveSpecialMessageAsync(groupId, GetUserId(), request);
        await Clients.Group(groupId.ToString()).SendAsync("ReceiveMessage", message);
    }

    public async Task SendHabitSuggestion(Guid groupId, SendHabitSuggestionRequest request)
    {
        var message = await _chatService.SaveHabitSuggestionAsync(groupId, GetUserId(), request);
        await Clients.Group(groupId.ToString()).SendAsync("ReceiveMessage", message);
    }

    public async Task RespondToSuggestion(Guid groupId, Guid suggestionId, bool accepted)
    {
        var status = await _chatService.RespondToSuggestionAsync(suggestionId, GetUserId(), accepted);
        await Clients.Group(groupId.ToString()).SendAsync("SuggestionUpdated", suggestionId, status);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
