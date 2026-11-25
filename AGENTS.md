# Agent instructions

## Project conventions

- Keep the website static and client-side. Do not add analytics, advertising, API calls, or runtime dependencies that do not serve the lookup flow.
- Keep Unicode data sourced from the Unicode Character Database. Regenerate checked-in metadata with npm run data:update.
- Keep the interface responsive and keyboard accessible. Use components from @oreui-web/react directly and keep local CSS focused on layout and responsive behavior.
- Run npm run typecheck, npm test, and npm run build after implementation changes.

## Writing style

Áp dụng các quy tắc sau cho tài liệu, code comments, nội dung giao diện, commit messages, pull requests và nội dung do Agents tạo ra.

- Không sử dụng ký tự Unicode U+2014 hoặc U+2013 làm dấu câu. Nếu thực sự cần dấu gạch ngang, sử dụng dấu ASCII -.
- Ưu tiên viết lại câu bằng dấu chấm, dấu phẩy, liên từ hoặc dấu ngoặc đơn.
- Hạn chế sử dụng dấu hai chấm trong văn bản thông thường.
- Tránh cấu trúc nhãn kèm giải thích. Thay vào đó, sử dụng câu hoàn chỉnh và tự nhiên.
- Tránh sử dụng dấu chấm phẩy trong văn bản thông thường.
- Sử dụng dấu chấm để tách các ý độc lập hoặc dấu phẩy kết hợp với liên từ phù hợp.
- Mỗi câu nên tập trung vào một ý chính nếu cách viết ngắn gọn giúp nội dung rõ ràng hơn.
- Mặc định sử dụng dấu ngoặc kép thẳng ".
- Không áp dụng các quy tắc này cho cú pháp lập trình, dữ liệu Unicode, ký tự glyph, trích dẫn nguyên văn hoặc nội dung kỹ thuật cần được giữ nguyên.
- Các quy tắc này giúp hạn chế lạm dụng dấu câu và không cấm tuyệt đối mọi trường hợp.
