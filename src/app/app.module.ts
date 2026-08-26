import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, close, menu, search, send } from 'ionicons/icons';
import { AppComponent } from './app.component';
import { ChatListComponent } from './components/chat-list/chat-list.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { MessageInputComponent } from './components/message-input/message-input.component';
import { MessageComponent } from './components/message/message.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AuthScreenComponent } from './components/auth-screen/auth-screen.component';

@NgModule({
    declarations: [
        AppComponent,
        AuthScreenComponent,
        SidebarComponent,
        ChatListComponent,
        ChatWindowComponent,
        MessageComponent,
        MessageInputComponent
    ],
    imports: [BrowserModule, HttpClientModule, FormsModule, IonicModule.forRoot()],
    bootstrap: [AppComponent]
})
export class AppModule {
    constructor() {
        addIcons({ add, close, menu, search, send });
    }
}
