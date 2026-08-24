import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppComponent } from './app.component';
import { ChatListComponent } from './components/chat-list/chat-list.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { MessageInputComponent } from './components/message-input/message-input.component';
import { MessageComponent } from './components/message/message.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@NgModule({
    declarations: [
        AppComponent,
        SidebarComponent,
        ChatListComponent,
        ChatWindowComponent,
        MessageComponent,
        MessageInputComponent
    ],
    imports: [BrowserModule, FormsModule, IonicModule.forRoot()],
    bootstrap: [AppComponent]
})
export class AppModule { }
